// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getFirestore, collection, addDoc, query, where, getDocs, Timestamp, orderBy } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAXNIo4h3Uv7Z8IGdm01zQ8K4WY4G8VLzE",
  authDomain: "uc-intto.firebaseapp.com",
  projectId: "uc-intto",
  storageBucket: "uc-intto.firebasestorage.app",
  messagingSenderId: "156771180433",
  appId: "1:156771180433:web:9aaaa56c9488bffeef0430",
  measurementId: "G-JG29QNQGCG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Debounce function to prevent rapid writes
function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

// Calendar and booking state
let currentDate = new Date();
let selectedDate = null;
let selectedTimeSlot = null;
let bookingsData = {};
let closedSchedules = [];
let allBookings = [];
let currentWeekStart = new Date();

// Time slots available (8AM to 5PM in 30-minute intervals)
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

// Initialize the calendar
function initCalendar() {
  renderCalendar();
  setupEventListeners();
  loadClosedSchedules();
  loadBookings();
  
  // Set current week start to Monday
  currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay() + 1);
}

// Render calendar days
function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  // Update month display
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
  document.getElementById('currentMonth').textContent = `${monthNames[month]} ${year}`;
  
  // Get first day of month and number of days
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  // Get calendar container
  const calendarDays = document.getElementById('calendarDays');
  calendarDays.innerHTML = '';
  
  // Add empty cells for days before month starts
  for (let i = 0; i < firstDay; i++) {
    const emptyDay = document.createElement('div');
    emptyDay.classList.add('calendar-day', 'empty');
    calendarDays.appendChild(emptyDay);
  }
  
  // Add days of the month
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
    
    // Check if entire day is closed
    const isFullDayClosed = closedSchedules.some(cs => cs.date === dateString && cs.type === 'full-day');
    
    // Check if day is in the past
    if (dayDate < today) {
      dayElement.classList.add('disabled');
    }
    // Check if day is Sunday (0) - disabled
    else if (dayOfWeek === 0) {
      dayElement.classList.add('disabled');
    }
    // Check if day is fully closed by admin
    else if (isFullDayClosed) {
      dayElement.classList.add('closed-day');
      dayElement.title = 'This day is closed';
    }
    // Available days (Monday to Saturday)
    else {
      dayElement.classList.add('available');
      dayElement.addEventListener('click', () => selectDate(dayDate, dayElement));
      
      // Check if this date has bookings
      if (bookingsData[dateString] && bookingsData[dateString].length > 0) {
        dayElement.classList.add('has-bookings');
      }
      
      // Check if day has partial closures
      const hasPartialClosure = closedSchedules.some(cs => cs.date === dateString && cs.type === 'specific-hours');
      if (hasPartialClosure) {
        dayElement.classList.add('partial-closed');
        dayElement.title = 'Some time slots are closed';
      }
    }
    
    calendarDays.appendChild(dayElement);
  }
}

// Format date as YYYY-MM-DD
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Format date for display
function formatDisplayDate(date) {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

// Select a date
function selectDate(date, element) {
  selectedDate = date;
  
  // Remove selected class from all days
  document.querySelectorAll('.calendar-day').forEach(day => {
    day.classList.remove('selected');
  });
  
  // Add selected class to clicked day
  element.classList.add('selected');
  
  // Show time slots
  showTimeSlots(date);
}

// Show available time slots for selected date
function showTimeSlots(date) {
  const dateString = formatDate(date);
  const container = document.getElementById('timeSlotsContainer');
  const grid = document.getElementById('timeSlotsGrid');
  const dateDisplay = document.getElementById('selectedDateDisplay');
  
  // Update date display
  dateDisplay.textContent = formatDisplayDate(date);
  
  // Clear previous time slots
  grid.innerHTML = '';
  
  // Get bookings for this date
  const bookedSlots = bookingsData[dateString] || [];
  
  // Get closed schedules for this date
  const closedSlotsForDate = closedSchedules.filter(cs => cs.date === dateString);
  const isFullDayClosed = closedSlotsForDate.some(cs => cs.type === 'full-day');
  
  // Create time slot elements
  timeSlots.forEach(slot => {
    const slotElement = document.createElement('div');
    slotElement.classList.add('time-slot');
    slotElement.textContent = `${slot.start}-${slot.end}`;
    slotElement.dataset.time = slot.value;
    
    // Check if slot is closed by admin
    const isClosed = isFullDayClosed || closedSlotsForDate.some(cs => 
      cs.type === 'specific-hours' && cs.timeSlots?.includes(slot.value)
    );
    
    if (isClosed) {
      slotElement.classList.add('closed');
      slotElement.title = 'This time slot is closed';
    }
    // Check if slot is already booked
    else {
      const isBooked = bookedSlots.some(booking => booking.timeSlot === slot.value);
      
      if (isBooked) {
        slotElement.classList.add('booked');
      } else {
        slotElement.addEventListener('click', () => selectTimeSlot(slot, slotElement));
      }
    }
    
    grid.appendChild(slotElement);
  });
  
  // Show container
  container.style.display = 'block';
  
  // Scroll to time slots
  container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Select a time slot
function selectTimeSlot(slot, element) {
  selectedTimeSlot = slot;
  
  // Remove selected class from all time slots
  document.querySelectorAll('.time-slot').forEach(ts => {
    ts.classList.remove('selected');
  });
  
  // Add selected class to clicked slot
  element.classList.add('selected');
  
  // Show booking modal
  showBookingModal();
}

// Show booking modal
function showBookingModal() {
  const modal = document.getElementById('bookingModal');
  const modalDate = document.getElementById('modalDate');
  const modalTime = document.getElementById('modalTime');
  
  // Set modal content
  modalDate.textContent = formatDisplayDate(selectedDate);
  modalTime.textContent = `${selectedTimeSlot.start}-${selectedTimeSlot.end}`;
  
  // Show modal
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

// Hide booking modal
function hideBookingModal() {
  const modal = document.getElementById('bookingModal');
  modal.classList.remove('active');
  document.body.style.overflow = 'auto';
  
  // Reset form
  document.getElementById('bookingForm').reset();
}

// Setup event listeners
function setupEventListeners() {
  // Month navigation
  document.getElementById('prevMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  });
  
  document.getElementById('nextMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  });
  
  // Modal close
  document.getElementById('modalClose').addEventListener('click', hideBookingModal);
  
  // Close modal on outside click
  document.getElementById('bookingModal').addEventListener('click', (e) => {
    if (e.target.id === 'bookingModal') {
      hideBookingModal();
    }
  });
  
  // Form submission
  document.getElementById('bookingForm').addEventListener('submit', handleBookingSubmit);
  
  // View Calendar button
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
  
  // Close calendar view modal on outside click
  document.getElementById('calendarViewModal').addEventListener('click', (e) => {
    if (e.target.id === 'calendarViewModal') {
      closeCalendarView();
    }
  });
}

// Load bookings from Firebase
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
    
    // Re-render calendar to show bookings
    renderCalendar();
  } catch (error) {
    console.error('Error loading bookings:', error);
  }
}

// Load closed schedules from Firebase
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
    
    // Re-render calendar to show closed days
    renderCalendar();
  } catch (error) {
    console.error('Error loading closed schedules:', error);
  }
}

// Handle booking form submission
async function handleBookingSubmit(e) {
  e.preventDefault();
  
  const submitBtn = e.target.querySelector('.submit-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Booking...';
  
  try {
    // Get form data
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
    
    // Check if slot is still available
    const dateString = formatDate(selectedDate);
    const bookingsRef = collection(db, 'tbiBookings');
    const q = query(
      bookingsRef,
      where('date', '==', dateString),
      where('timeSlot', '==', selectedTimeSlot.value)
    );
    
    const existingBookings = await getDocs(q);
    
    if (!existingBookings.empty) {
      alert('Sorry, this time slot has just been booked. Please select another time.');
      hideBookingModal();
      loadBookings();
      return;
    }
    
    // Save to Firebase
    const debouncedAdd = debounce(async (data) => {
      await addDoc(bookingsRef, data);
    }, 1000);
    await debouncedAdd(formData);
    
    // Show success message
    alert('Booking successful! You will receive a confirmation email shortly.');
    
    // Close modal and reload bookings
    hideBookingModal();
    loadBookings();
    
    // Reset selections
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

// Open calendar view modal
function openCalendarView() {
  document.getElementById('calendarViewModal').classList.add('active');
  document.body.style.overflow = 'hidden';
  renderCalendarView();
}

// Close calendar view modal
function closeCalendarView() {
  document.getElementById('calendarViewModal').classList.remove('active');
  document.body.style.overflow = 'auto';
}

// Render calendar view
function renderCalendarView() {
  const header = document.getElementById('calendarViewHeader');
  const body = document.getElementById('calendarViewBody');
  const weekDisplay = document.getElementById('calendarViewWeekDisplay');
  
  // Calculate week end date (Monday to Saturday, 6 days)
  const weekEnd = new Date(currentWeekStart);
  weekEnd.setDate(weekEnd.getDate() + 5);
  
  // Update week display
  const weekStartStr = currentWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const weekEndStr = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  weekDisplay.textContent = `Week of ${weekStartStr} - ${weekEndStr}`;
  
  // Get week dates (Monday to Saturday)
  const weekDates = [];
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  for (let i = 0; i < 6; i++) {
    const date = new Date(currentWeekStart);
    date.setDate(date.getDate() + i);
    weekDates.push(date);
  }
  
  // Build header row
  let headerHTML = '<th class="time-slot-header">Time Slot</th>';
  weekDates.forEach((date, index) => {
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    headerHTML += `<th>${dayNames[index]}<br><small>${dateStr}</small></th>`;
  });
  header.innerHTML = headerHTML;
  
  // Build body rows
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

// Get cell data for calendar view
function getCalendarCellData(dateStr, timeSlot) {
  // Check if this slot is closed
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
  
  // Check if there's a booking for this slot
  const booking = allBookings.find(b => 
    b.date === dateStr && 
    b.timeSlot === timeSlot &&
    (b.status === 'pending' || b.status === 'confirmed')
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
  
  // Available slot
  return `
    <td class="calendar-cell available">
      <div class="cell-content">
        <span class="status-text">Available</span>
      </div>
    </td>
  `;
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initCalendar);
