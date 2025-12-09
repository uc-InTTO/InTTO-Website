
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getFirestore, collection, addDoc, query, where, getDocs, Timestamp, orderBy } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAXNIo4h3Uv7Z8IGdm01zQ8K4WY4G8VLzE",
  authDomain: "uc-intto.firebaseapp.com",
  projectId: "uc-intto",
  storageBucket: "uc-intto.firebasestorage.app",
  messagingSenderId: "156771180433",
  appId: "1:156771180433:web:9aaaa56c9488bffeef0430",
  measurementId: "G-JG29QNQGCG"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

let currentDate = new Date();
let selectedDate = null;
let selectedTimeSlot = null;
let bookingsData = {};
let closedSchedules = [];
let allBookings = [];
let currentWeekStart = new Date();

const timeSlots = [
  { start: '8:00AM', end: '8:30AM', value: '08:00' },
  { start: '8:30AM', end: '9:00AM', value: '08:30' },
  { start: '9:00AM', end: '9:30AM', value: '09:00' },
  { start: '9:30AM', end: '10:00AM', value: '09:30' },
  { start: '10:00AM', end: '10:30AM', value: '10:00' },
  { start: '10:30AM', end: '11:00AM', value: '10:30' },
  { start: '11:00AM', end: '11:30AM', value: '11:00' },
  { start: '11:30AM', end: '12:00PM', value: '11:30' },
  { start: '12:00PM', end: '12:30PM', value: '12:00' },
  { start: '12:30PM', end: '1:00PM', value: '12:30' },
  { start: '1:00PM', end: '1:30PM', value: '13:00' },
  { start: '1:30PM', end: '2:00PM', value: '13:30' },
  { start: '2:00PM', end: '2:30PM', value: '14:00' },
  { start: '2:30PM', end: '3:00PM', value: '14:30' },
  { start: '3:00PM', end: '3:30PM', value: '15:00' },
  { start: '3:30PM', end: '4:00PM', value: '15:30' },
  { start: '4:00PM', end: '4:30PM', value: '16:00' },
  { start: '4:30PM', end: '5:00PM', value: '16:30' }
];

function initCalendar() {
  renderCalendar();
  setupEventListeners();
  loadClosedSchedules();
  loadBookings();
  
  currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay() + 1);
}

function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
  document.getElementById('currentMonth').textContent = `${monthNames[month]} ${year}`;
  
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const calendarDays = document.getElementById('calendarDays');
  calendarDays.innerHTML = '';
  
  for (let i = 0; i < firstDay; i++) {
    const emptyDay = document.createElement('div');
    emptyDay.classList.add('calendar-day', 'empty');
    calendarDays.appendChild(emptyDay);
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  for (let day = 1; day <= daysInMonth; day++) {
    const dayDate = new Date(year, month, day);
    const dayOfWeek = dayDate.getDay();
    const dateString = formatDate(dayDate);
    
    const dayElement = document.createElement('div');
    dayElement.classList.add('calendar-day');
    dayElement.textContent = day;
    dayElement.dataset.date = dateString;
    
    const isFullDayClosed = closedSchedules.some(cs => cs.date === dateString && cs.type === 'full-day');
    
    if (dayDate < today) {
      dayElement.classList.add('disabled');
    }
    else if (dayOfWeek === 0) {
      dayElement.classList.add('disabled');
    }
    else if (isFullDayClosed) {
      dayElement.classList.add('closed-day');
      dayElement.title = 'This day is closed';
    }
    else {
      dayElement.classList.add('available');
      dayElement.addEventListener('click', () => selectDate(dayDate, dayElement));
      
      const hasActiveBookings = bookingsData[dateString] && bookingsData[dateString].some(b => 
        ['pending', 'confirmed', 'rescheduled'].includes(b.status)
      );

      if (hasActiveBookings) {
        dayElement.classList.add('has-bookings');
      }
      
      const hasPartialClosure = closedSchedules.some(cs => cs.date === dateString && cs.type === 'specific-hours');
      if (hasPartialClosure) {
        dayElement.classList.add('partial-closed');
        dayElement.title = 'Some time slots are closed';
      }
    }
    
    calendarDays.appendChild(dayElement);
  }
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(date) {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

function selectDate(date, element) {
  selectedDate = date;
  
  document.querySelectorAll('.calendar-day').forEach(day => {
    day.classList.remove('selected');
  });
  
  element.classList.add('selected');
  
  showTimeSlots(date);
}

function showTimeSlots(date) {
  const dateString = formatDate(date);
  const container = document.getElementById('timeSlotsContainer');
  const grid = document.getElementById('timeSlotsGrid');
  const dateDisplay = document.getElementById('selectedDateDisplay');
  
  dateDisplay.textContent = formatDisplayDate(date);
  
  grid.innerHTML = '';
  
  const bookedSlots = bookingsData[dateString] || [];
  
  const closedSlotsForDate = closedSchedules.filter(cs => cs.date === dateString);
  const isFullDayClosed = closedSlotsForDate.some(cs => cs.type === 'full-day');
  
  timeSlots.forEach(slot => {
    const slotElement = document.createElement('div');
    slotElement.classList.add('time-slot');
    slotElement.textContent = `${slot.start}-${slot.end}`;
    slotElement.dataset.time = slot.value;
    
    const isClosed = isFullDayClosed || closedSlotsForDate.some(cs => 
      cs.type === 'specific-hours' && cs.timeSlots?.includes(slot.value)
    );
    
    if (isClosed) {
      slotElement.classList.add('closed');
      slotElement.title = 'This time slot is closed';
    }
    else {
      const isBooked = bookedSlots.some(booking => 
        booking.timeSlot === slot.value && 
        ['pending', 'confirmed', 'rescheduled'].includes(booking.status)
      );
      
      if (isBooked) {
        slotElement.classList.add('booked');
      } else {
        slotElement.addEventListener('click', () => selectTimeSlot(slot, slotElement));
      }
    }
    
    grid.appendChild(slotElement);
  });
  
  container.style.display = 'block';
  
  container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function selectTimeSlot(slot, element) {
  selectedTimeSlot = slot;
  
  document.querySelectorAll('.time-slot').forEach(ts => {
    ts.classList.remove('selected');
  });
  
  element.classList.add('selected');
  
  showBookingModal();
}

function showBookingModal() {
  const modal = document.getElementById('bookingModal');
  const modalDate = document.getElementById('modalDate');
  const modalTime = document.getElementById('modalTime');
  
  modalDate.textContent = formatDisplayDate(selectedDate);
  modalTime.textContent = `${selectedTimeSlot.start}-${selectedTimeSlot.end}`;
  
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function hideBookingModal() {
  const modal = document.getElementById('bookingModal');
  modal.classList.remove('active');
  document.body.style.overflow = 'auto';
  
  document.getElementById('bookingForm').reset();
}

function setupEventListeners() {
  document.getElementById('prevMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  });
  
  document.getElementById('nextMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  });
  
  document.getElementById('modalClose').addEventListener('click', hideBookingModal);
  
  document.getElementById('bookingModal').addEventListener('click', (e) => {
    if (e.target.id === 'bookingModal') {
      hideBookingModal();
    }
  });
  
  document.getElementById('bookingForm').addEventListener('submit', handleBookingSubmit);
  
  document.getElementById('viewCalendarBtn').addEventListener('click', openCalendarView);
  document.getElementById('calendarViewClose').addEventListener('click', closeCalendarView);
  document.getElementById('prevWeekView').addEventListener('click', () => {
    currentWeekStart.setDate(currentWeekStart.getDate() - 7);
    renderCalendarView();
  });
  document.getElementById('nextWeekView').addEventListener('click', () => {
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    renderCalendarView();
  });
  
  document.getElementById('calendarViewModal').addEventListener('click', (e) => {
    if (e.target.id === 'calendarViewModal') {
      closeCalendarView();
    }
  });
}

async function loadBookings() {
  try {
    const bookingsRef = collection(db, 'tbiBookings');
    const snapshot = await getDocs(bookingsRef);
    
    bookingsData = {};
    allBookings = [];
    
    snapshot.forEach(doc => {
      const booking = doc.data();
      const dateString = booking.date;
      
      allBookings.push({
        id: doc.id,
        ...booking
      });
      
      if (!bookingsData[dateString]) {
        bookingsData[dateString] = [];
      }
      
      bookingsData[dateString].push({
        timeSlot: booking.timeSlot,
        ...booking
      });
    });
    
    renderCalendar();
  } catch (error) {
    console.error('Error loading bookings:', error);
  }
}

async function loadClosedSchedules() {
  try {
    const closedRef = collection(db, 'closedSchedules');
    const q = query(closedRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    closedSchedules = [];
    snapshot.forEach(doc => {
      closedSchedules.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    renderCalendar();
  } catch (error) {
    console.error('Error loading closed schedules:', error);
  }
}

async function handleBookingSubmit(e) {
  e.preventDefault();
  
  const submitBtn = e.target.querySelector('.submit-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Booking...';
  
  try {
    const formData = {
      serviceType: document.getElementById('serviceType').value,
      fullName: document.getElementById('fullName').value,
      email: document.getElementById('email').value,
      projectName: document.getElementById('projectName').value,
      teamMembers: document.getElementById('teamMembers').value,
      projectDescription: document.getElementById('projectDescription').value,
      date: formatDate(selectedDate),
      timeSlot: selectedTimeSlot.value,
      timeSlotDisplay: `${selectedTimeSlot.start}-${selectedTimeSlot.end}`,
      createdAt: Timestamp.now(),
      status: 'pending'
    };
    
    const dateString = formatDate(selectedDate);
    const bookingsRef = collection(db, 'tbiBookings');
    const q = query(
      bookingsRef,
      where('date', '==', dateString),
      where('timeSlot', '==', selectedTimeSlot.value)
    );
    
    const existingBookings = await getDocs(q);
    
    const isSlotTaken = !existingBookings.empty && existingBookings.docs.some(doc => {
      const data = doc.data();
      return ['pending', 'confirmed', 'rescheduled'].includes(data.status);
    });

    if (isSlotTaken) {
      alert('Sorry, this time slot has just been booked. Please select another time.');
      hideBookingModal();
      loadBookings();
      return;
    }
    
    const debouncedAdd = debounce(async (data) => {
      await addDoc(bookingsRef, data);
    }, 1000);
    await debouncedAdd(formData);
    
    alert('Booking successful! You will receive a confirmation email shortly.');
    
    hideBookingModal();
    loadBookings();
    
    selectedDate = null;
    selectedTimeSlot = null;
    document.getElementById('timeSlotsContainer').style.display = 'none';
    document.querySelectorAll('.calendar-day').forEach(day => {
      day.classList.remove('selected');
    });
    
  } catch (error) {
    console.error('Error creating booking:', error);
    alert('There was an error creating your booking. Please try again.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Book Assessment';
  }
}

function openCalendarView() {
  document.getElementById('calendarViewModal').classList.add('active');
  document.body.style.overflow = 'hidden';
  renderCalendarView();
}

function closeCalendarView() {
  document.getElementById('calendarViewModal').classList.remove('active');
  document.body.style.overflow = 'auto';
}

function renderCalendarView() {
  const header = document.getElementById('calendarViewHeader');
  const body = document.getElementById('calendarViewBody');
  const weekDisplay = document.getElementById('calendarViewWeekDisplay');
  
  const weekEnd = new Date(currentWeekStart);
  weekEnd.setDate(weekEnd.getDate() + 5);
  
  const weekStartStr = currentWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const weekEndStr = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  weekDisplay.textContent = `Week of ${weekStartStr} - ${weekEndStr}`;
  
  const weekDates = [];
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  for (let i = 0; i < 6; i++) {
    const date = new Date(currentWeekStart);
    date.setDate(date.getDate() + i);
    weekDates.push(date);
  }
  
  let headerHTML = '<th class="time-slot-header">Time Slot</th>';
  weekDates.forEach((date, index) => {
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    headerHTML += `<th>${dayNames[index]}<br><small>${dateStr}</small></th>`;
  });
  header.innerHTML = headerHTML;
  
  let bodyHTML = '';
  timeSlots.forEach(slot => {
    bodyHTML += '<tr>';
    bodyHTML += `<td class="time-slot-cell"><strong>${slot.start} - ${slot.end}</strong></td>`;
    
    weekDates.forEach(date => {
      const dateString = formatDate(date);
      const cellData = getCalendarCellData(dateString, slot.value);
      bodyHTML += cellData;
    });
    
    bodyHTML += '</tr>';
  });
  
  body.innerHTML = bodyHTML;
}

function getCalendarCellData(dateStr, timeSlot) {
  const closedSlot = closedSchedules.find(cs => {
    if (cs.date !== dateStr) return false;
    if (cs.type === 'full-day') return true;
    if (cs.type === 'specific-hours' && cs.timeSlots?.includes(timeSlot)) return true;
    return false;
  });
  
  if (closedSlot) {
    return `
      <td class="calendar-cell closed">
        <div class="cell-content">
          <span class="status-badge">Closed</span>
          <small>${closedSlot.reason || ''}</small>
        </div>
      </td>
    `;
  }
  
  const booking = allBookings.find(b => 
    b.date === dateStr && 
    b.timeSlot === timeSlot &&
    (b.status === 'pending' || b.status === 'confirmed' || b.status === 'rescheduled')
  );
  
  if (booking) {
    return `
      <td class="calendar-cell booked">
        <div class="cell-content">
          <span class="status-badge ${booking.status}">${booking.status}</span>
          <small>${booking.fullName || ''}</small>
          <small>${booking.serviceType || 'TBI Assessment'}</small>
        </div>
      </td>
    `;
  }
  
  return `
    <td class="calendar-cell available">
      <div class="cell-content">
        <span class="status-text">Available</span>
      </div>
    </td>
  `;
}

document.addEventListener('DOMContentLoaded', initCalendar);