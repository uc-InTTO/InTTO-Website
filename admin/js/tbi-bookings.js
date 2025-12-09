

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, updateDoc, addDoc, deleteDoc, query, where, orderBy, Timestamp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

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

let allBookings = [];
let filteredBookings = [];
let currentBookingId = null;
let closedSchedules = [];
let affectedBookingsForReschedule = [];
let pendingClosureData = null;
let rescheduleCalendarDate = new Date();
let selectedRescheduleDate = null;
let selectedRescheduleTime = null;
let currentRescheduleBookingIndex = null;
let temporaryAssignments = []; 

let singleRescheduleCalendarDate = new Date();
let selectedSingleRescheduleDate = null;
let selectedSingleRescheduleTime = null;
let singleRescheduleAssigned = false;

const timeSlotDisplay = {
  '08:00': '8:00AM - 8:30AM',
  '08:30': '8:30AM - 9:00AM',
  '09:00': '9:00AM - 9:30AM',
  '09:30': '9:30AM - 10:00AM',
  '10:00': '10:00AM - 10:30AM',
  '10:30': '10:30AM - 11:00AM',
  '11:00': '11:00AM - 11:30AM',
  '11:30': '11:30AM - 12:00PM',
  '12:00': '12:00PM - 12:30PM',
  '12:30': '12:30PM - 1:00PM',
  '13:00': '1:00PM - 1:30PM',
  '13:30': '1:30PM - 2:00PM',
  '14:00': '2:00PM - 2:30PM',
  '14:30': '2:30PM - 3:00PM',
  '15:00': '3:00PM - 3:30PM',
  '15:30': '3:30PM - 4:00PM',
  '16:00': '4:00PM - 4:30PM',
  '16:30': '4:30PM - 5:00PM'
};

document.addEventListener('DOMContentLoaded', () => {
  loadBookings();
  loadClosedSchedules();
  setupEventListeners();
});

async function loadBookings() {
  try {
    const bookingsRef = collection(db, 'tbiBookings');
    const q = query(bookingsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    allBookings = [];
    snapshot.forEach(doc => {
      allBookings.push({
        id: doc.id,
        ...doc.data()
      });
    });

    allBookings.sort((a, b) => {
      const dateCompare = new Date(b.date) - new Date(a.date);
      if (dateCompare !== 0) return dateCompare;
      
      const aCreated = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
      const bCreated = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
      return aCreated - bCreated;
    });

    filteredBookings = [...allBookings];
    renderBookings();
    updateStats();
  } catch (error) {
    console.error('Error loading bookings:', error);
    showError('Failed to load bookings');
  }
}

function renderBookings() {
  const tbody = document.getElementById('bookingsTableBody');
  
  if (filteredBookings.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" class="loading-row">
          <i class="fa-solid fa-inbox"></i> No bookings found
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = filteredBookings.map(booking => `
    <tr>
      <td><strong>#${booking.id.substring(0, 8)}</strong></td>
      <td>${booking.serviceType || 'TBI Assessment'}</td>
      <td>${booking.fullName}</td>
      <td>${booking.email}</td>
      <td>${booking.projectName || '-'}</td>
      <td>${formatDate(booking.date)}</td>
      <td>${timeSlotDisplay[booking.timeSlot] || booking.timeSlotDisplay}</td>
      <td><span class="status-badge ${booking.status}">${booking.status}</span></td>
      <td>${formatTimestamp(booking.createdAt)}</td>
      <td>
        <div class="action-buttons">
          <button class="btn-action btn-view" onclick="viewBooking('${booking.id}')">
            <i class="fa-solid fa-eye"></i> View
          </button>
          ${booking.status === 'pending' || booking.status === 'confirmed' || booking.status === 'rescheduled' ? `
            <button class="btn-action btn-reschedule" onclick="openRescheduleModal('${booking.id}')">
              <i class="fa-solid fa-calendar-alt"></i> Reschedule
            </button>
          ` : ''}
          ${booking.status === 'pending' ? `
            <button class="btn-action btn-confirm" onclick="confirmBooking('${booking.id}')">
              <i class="fa-solid fa-check"></i> Confirm
            </button>
          ` : ''}
          ${booking.status === 'confirmed' || booking.status === 'rescheduled' ? `
            <button class="btn-action btn-complete" onclick="completeBooking('${booking.id}')">
              <i class="fa-solid fa-check-double"></i> Complete
            </button>
          ` : ''}
          ${booking.status === 'pending' || booking.status === 'confirmed' || booking.status === 'rescheduled' ? `
            <button class="btn-action btn-cancel" onclick="cancelBooking('${booking.id}')">
              <i class="fa-solid fa-times"></i> Cancel
            </button>
          ` : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

function updateStats() {
  const stats = {
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0
  };
  
  allBookings.forEach(booking => {
    if (stats.hasOwnProperty(booking.status)) {
      stats[booking.status]++;
    }
  });
  
  document.getElementById('pendingCount').textContent = stats.pending;
  document.getElementById('confirmedCount').textContent = stats.confirmed;
  document.getElementById('completedCount').textContent = stats.completed;
  document.getElementById('cancelledCount').textContent = stats.cancelled;
}

function setupEventListeners() {
  document.getElementById('statusFilter').addEventListener('change', applyFilters);
  document.getElementById('serviceFilter').addEventListener('change', applyFilters);
  document.getElementById('dateFilter').addEventListener('change', applyFilters);
  document.getElementById('searchFilter').addEventListener('input', applyFilters);
  document.getElementById('resetFilters').addEventListener('click', resetFilters);
  
  document.getElementById('closeRescheduleModal').addEventListener('click', closeRescheduleModal);
  document.getElementById('cancelReschedule').addEventListener('click', closeRescheduleModal);
  document.getElementById('closeViewModal').addEventListener('click', closeViewModal);
  
  document.getElementById('openCloseDayModal').addEventListener('click', openCloseDayModal);
  document.getElementById('closeCloseDayModal').addEventListener('click', closeCloseDayModal);
  document.getElementById('cancelCloseDay').addEventListener('click', closeCloseDayModal);
  
  document.getElementById('closeType').addEventListener('change', (e) => {
    const timeSlotGroup = document.getElementById('timeSlotGroup');
    if (e.target.value === 'specific-hours') {
      timeSlotGroup.style.display = 'block';
    } else {
      timeSlotGroup.style.display = 'none';
    }
  });
  
  document.getElementById('closeDayForm').addEventListener('submit', handleCloseDay);
  
  document.getElementById('closeManualRescheduleModal')?.addEventListener('click', closeManualRescheduleModal);
  document.getElementById('cancelManualReschedule')?.addEventListener('click', closeManualRescheduleModal);
  document.getElementById('confirmAllReschedules')?.addEventListener('click', confirmAllReschedules);
  
  document.getElementById('prevMonthReschedule')?.addEventListener('click', () => {
    rescheduleCalendarDate.setMonth(rescheduleCalendarDate.getMonth() - 1);
    renderRescheduleCalendar();
  });
  document.getElementById('nextMonthReschedule')?.addEventListener('click', () => {
    rescheduleCalendarDate.setMonth(rescheduleCalendarDate.getMonth() + 1);
    renderRescheduleCalendar();
  });
  
  document.getElementById('prevMonthSingleReschedule')?.addEventListener('click', () => {
    singleRescheduleCalendarDate.setMonth(singleRescheduleCalendarDate.getMonth() - 1);
    renderSingleRescheduleCalendar();
  });
  document.getElementById('nextMonthSingleReschedule')?.addEventListener('click', () => {
    singleRescheduleCalendarDate.setMonth(singleRescheduleCalendarDate.getMonth() + 1);
    renderSingleRescheduleCalendar();
  });
  
  document.getElementById('confirmSingleReschedule')?.addEventListener('click', handleSingleReschedule);
  
  document.getElementById('rescheduleModal').addEventListener('click', (e) => {
    if (e.target.id === 'rescheduleModal') closeRescheduleModal();
  });
  document.getElementById('viewModal').addEventListener('click', (e) => {
    if (e.target.id === 'viewModal') closeViewModal();
  });
  document.getElementById('closeDayModal').addEventListener('click', (e) => {
    if (e.target.id === 'closeDayModal') closeCloseDayModal();
  });
  document.getElementById('manualRescheduleModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'manualRescheduleModal') closeManualRescheduleModal();
  });
  
  const closeDateInput = document.getElementById('closeDateStart');
  if (closeDateInput) {
    closeDateInput.min = new Date().toISOString().split('T')[0];
  }
}

function applyFilters() {
  const statusFilter = document.getElementById('statusFilter').value;
  const serviceFilter = document.getElementById('serviceFilter').value;
  const dateFilter = document.getElementById('dateFilter').value;
  const searchFilter = document.getElementById('searchFilter').value.toLowerCase();
  
  filteredBookings = allBookings.filter(booking => {
    if (statusFilter !== 'all' && booking.status !== statusFilter) return false;
    
    if (serviceFilter !== 'all' && booking.serviceType !== serviceFilter) return false;
    
    if (dateFilter && booking.date !== dateFilter) return false;
    
    if (searchFilter) {
      const searchableText = `
        ${booking.fullName}
        ${booking.email}
        ${booking.projectName}
        ${booking.teamMembers}
      `.toLowerCase();
      
      if (!searchableText.includes(searchFilter)) return false;
    }
    
    return true;
  });

  filteredBookings.sort((a, b) => {
    const dateCompare = new Date(b.date) - new Date(a.date);
    if (dateCompare !== 0) return dateCompare;
    
    const aCreated = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
    const bCreated = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
    return aCreated - bCreated;
  });
  
  renderBookings();
}

function resetFilters() {
  document.getElementById('statusFilter').value = 'all';
  document.getElementById('serviceFilter').value = 'all';
  document.getElementById('dateFilter').value = '';
  document.getElementById('searchFilter').value = '';
  applyFilters();
}

window.viewBooking = function(bookingId) {
  const booking = allBookings.find(b => b.id === bookingId);
  if (!booking) return;
  
  document.getElementById('viewBookingId').textContent = '#' + booking.id.substring(0, 8);
  document.getElementById('viewServiceType').textContent = booking.serviceType || 'TBI Assessment';
  document.getElementById('viewClientName').textContent = booking.fullName;
  document.getElementById('viewEmail').textContent = booking.email;
  document.getElementById('viewProjectName').textContent = booking.projectName || '-';
  document.getElementById('viewTeamMembers').textContent = booking.teamMembers || '-';
  document.getElementById('viewProjectDescription').textContent = booking.projectDescription || '-';
  document.getElementById('viewDate').textContent = formatDate(booking.date);
  document.getElementById('viewTime').textContent = timeSlotDisplay[booking.timeSlot] || booking.timeSlotDisplay;
  
  const statusBadge = document.getElementById('viewStatus');
  statusBadge.textContent = booking.status;
  statusBadge.className = 'status-badge ' + booking.status;
  
  document.getElementById('viewCreatedAt').textContent = formatTimestamp(booking.createdAt);
  
  document.getElementById('viewModal').classList.add('active');
  document.body.style.overflow = 'hidden';
};

window.openRescheduleModal = function(bookingId) {
  currentBookingId = bookingId;
  const booking = allBookings.find(b => b.id === bookingId);
  if (!booking) return;
  
  document.getElementById('rescheduleClientName').textContent = booking.fullName;
  document.getElementById('rescheduleServiceType').textContent = booking.serviceType || 'TBI Assessment';
  document.getElementById('rescheduleCurrentDate').textContent = formatDate(booking.date);
  document.getElementById('rescheduleCurrentTime').textContent = timeSlotDisplay[booking.timeSlot] || booking.timeSlotDisplay;
  
  singleRescheduleCalendarDate = new Date();
  selectedSingleRescheduleDate = null;
  selectedSingleRescheduleTime = null;
  singleRescheduleAssigned = false;
  
  document.getElementById('assignedScheduleSingle').style.display = 'none';
  document.getElementById('assignBtnSingle').style.display = 'block';
  document.getElementById('timeSlotsReschedule').style.display = 'none';
  document.getElementById('rescheduleReason').value = '';
  
  renderSingleRescheduleCalendar();
  
  document.getElementById('rescheduleModal').classList.add('active');
  document.body.style.overflow = 'hidden';
};

function closeRescheduleModal() {
  document.getElementById('rescheduleModal').classList.remove('active');
  document.body.style.overflow = 'auto';
  currentBookingId = null;
  selectedSingleRescheduleDate = null;
  selectedSingleRescheduleTime = null;
  singleRescheduleAssigned = false;
}

function closeViewModal() {
  document.getElementById('viewModal').classList.remove('active');
  document.body.style.overflow = 'auto';
}

async function handleSingleReschedule() {
  if (!currentBookingId) return;
  
  if (!singleRescheduleAssigned || !selectedSingleRescheduleDate || !selectedSingleRescheduleTime) {
    alert('Please select a new date and time slot first.');
    return;
  }
  
  const reason = document.getElementById('rescheduleReason').value.trim();
  if (!reason) {
    alert('Please enter a reason for rescheduling.');
    return;
  }
  
  const submitBtn = document.getElementById('confirmSingleReschedule');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Rescheduling...';
  
  try {
    const booking = allBookings.find(b => b.id === currentBookingId);
    const newDate = formatDateForComparison(selectedSingleRescheduleDate);
    const newTimeSlot = selectedSingleRescheduleTime;
    
    const bookingRef = doc(db, 'tbiBookings', currentBookingId);
    await updateDoc(bookingRef, {
      oldDate: booking.date,
      oldTimeSlot: booking.timeSlot,
      date: newDate,
      timeSlot: newTimeSlot,
      timeSlotDisplay: timeSlotDisplay[newTimeSlot],
      status: 'rescheduled',
      rescheduleReason: reason,
      rescheduledAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    
    sendRescheduleEmail(booking, newDate, newTimeSlot, reason);
    
    alert('Booking rescheduled successfully! Gmail compose window opened for email notification.');
    closeRescheduleModal();
    loadBookings();
    setTimeout(() => location.reload(), 1500);
    
  } catch (error) {
    console.error('Error rescheduling booking:', error);
    alert('Failed to reschedule booking. Please try again.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Confirm Reschedule & Send Email';
  }
}

function renderSingleRescheduleCalendar() {
  const year = singleRescheduleCalendarDate.getFullYear();
  const month = singleRescheduleCalendarDate.getMonth();
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
  document.getElementById('singleRescheduleMonthDisplay').textContent = `${monthNames[month]} ${year}`;
  
  const firstDay = new Date(year, month, 1).getDay();
  const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1; 
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarDays = document.getElementById('singleRescheduleCalendarDays');
  calendarDays.innerHTML = '';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  for (let i = 0; i < adjustedFirstDay; i++) {
    const emptyDay = document.createElement('div');
    emptyDay.classList.add('mini-calendar-day', 'empty');
    calendarDays.appendChild(emptyDay);
  }
  
  for (let day = 1; day <= daysInMonth; day++) {
    const dayDate = new Date(year, month, day);
    const dayOfWeek = dayDate.getDay();
    const dateString = formatDateForComparison(dayDate);
    
    const dayElement = document.createElement('div');
    dayElement.classList.add('mini-calendar-day');
    dayElement.textContent = day;
    
    if (dayOfWeek === 0) {
      dayElement.classList.add('disabled');
      dayElement.style.display = 'none';
      calendarDays.appendChild(dayElement);
      continue;
    }
    
    if (dayDate < today) {
      dayElement.classList.add('disabled');
    }
    else if (closedSchedules.some(cs => cs.date === dateString && cs.type === 'full-day')) {
      dayElement.classList.add('closed-day');
    }
    else {
      dayElement.addEventListener('click', () => selectSingleRescheduleDate(dayDate, dayElement));
      
      const hasAvailableSlots = checkDayHasAvailableSlots(dateString);
      if (hasAvailableSlots) {
        dayElement.classList.add('has-slots');
      }
    }
    
    if (selectedSingleRescheduleDate && formatDateForComparison(selectedSingleRescheduleDate) === dateString) {
      dayElement.classList.add('selected-reschedule');
    }
    
    calendarDays.appendChild(dayElement);
  }
}

function selectSingleRescheduleDate(date, element) {
  selectedSingleRescheduleDate = date;
  selectedSingleRescheduleTime = null;
  
  document.querySelectorAll('#singleRescheduleCalendarDays .mini-calendar-day').forEach(day => {
    day.classList.remove('selected-reschedule');
  });
  element.classList.add('selected-reschedule');
  
  showSingleRescheduleTimeSlots(date);
}

function showSingleRescheduleTimeSlots(date) {
  const dateString = formatDateForComparison(date);
  const container = document.getElementById('timeSlotsReschedule');
  const grid = document.getElementById('timeSlotsGridReschedule');
  const dateDisplay = document.getElementById('selectedDateReschedule');
  
  dateDisplay.textContent = formatDate(dateString);
  
  const timeSlots = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', 
                      '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', 
                      '16:00', '16:30'];
  
  grid.innerHTML = timeSlots.map(slot => {
    const isClosed = closedSchedules.some(cs => {
      if (cs.date !== dateString) return false;
      if (cs.type === 'full-day') return true;
      if (cs.type === 'specific-hours' && cs.timeSlots?.includes(slot)) return true;
      return false;
    });
    
    if (isClosed) {
      return `<div class="time-slot-reschedule closed">${timeSlotDisplay[slot]}<br><small>Closed</small></div>`;
    }
    
    const isBooked = allBookings.some(b => 
      b.date === dateString && 
      b.timeSlot === slot && 
      b.id !== currentBookingId &&
      (b.status === 'pending' || b.status === 'confirmed' || b.status === 'rescheduled')
    );
    
    if (isBooked) {
      return `<div class="time-slot-reschedule booked">${timeSlotDisplay[slot]}<br><small>Booked</small></div>`;
    }
    
    const selectedClass = (selectedSingleRescheduleTime === slot) ? 'selected-time' : '';
    return `<div class="time-slot-reschedule ${selectedClass}" onclick="selectSingleRescheduleTime('${slot}', this)">
      ${timeSlotDisplay[slot]}<br><small>Available</small>
    </div>`;
  }).join('');
  
  container.style.display = 'block';
}

window.selectSingleRescheduleTime = function(timeSlot, element) {
  if (!selectedSingleRescheduleDate) {
    alert('Please select a date first.');
    return;
  }
  
  selectedSingleRescheduleTime = timeSlot;
  
  document.querySelectorAll('.time-slot-reschedule').forEach(slot => {
    slot.classList.remove('selected-time');
  });
  element.classList.add('selected-time');
  
  if (currentRescheduleBookingIndex !== null) {
    assignSelectedSlot();
  }
};

window.startAssigning = function(index) {
  currentRescheduleBookingIndex = index;
  
  document.querySelectorAll('.affected-booking-item').forEach((item, i) => {
    if (i === index) {
      item.style.border = '3px solid #166647';
      item.style.background = '#f0f9f0';
    } else {
      item.style.border = '1px solid #dee2e6';
      item.style.background = '#f8f9fa';
    }
  });
  
  document.querySelector('.reschedule-calendar-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

window.reassignBooking = function(index) {
  startAssigning(index);
};

function assignSelectedSlot() {
  if (currentRescheduleBookingIndex === null || !selectedRescheduleDate || !selectedRescheduleTime) {
    return;
  }
  
  const index = currentRescheduleBookingIndex;
  const dateString = formatDateForComparison(selectedRescheduleDate);
  
  const previousAssignment = temporaryAssignments.findIndex(ta => ta.bookingIndex === index);
  if (previousAssignment !== -1) {
    temporaryAssignments.splice(previousAssignment, 1);
  }
  
  temporaryAssignments.push({
    bookingIndex: index,
    date: dateString,
    timeSlot: selectedRescheduleTime
  });
  
  document.getElementById(`assignedSchedule_${index}`).style.display = 'block';
  document.getElementById(`assignedDate_${index}`).textContent = formatDate(dateString);
  document.getElementById(`assignedTime_${index}`).textContent = timeSlotDisplay[selectedRescheduleTime];
  document.getElementById(`assignBtn_${index}`).style.display = 'none';
  
  affectedBookingsForReschedule[index].newDate = dateString;
  affectedBookingsForReschedule[index].newTime = selectedRescheduleTime;
  
  document.querySelectorAll('.affected-booking-item').forEach(item => {
    item.style.border = '1px solid #dee2e6';
    item.style.background = '#f8f9fa';
  });
  
  currentRescheduleBookingIndex = null;
  selectedRescheduleDate = null;
  selectedRescheduleTime = null;
  
  document.getElementById('timeSlotsReschedule').style.display = 'none';
  
  renderRescheduleCalendar();
  
  const nextUnassigned = affectedBookingsForReschedule.findIndex((b, i) => i > index && !b.newDate);
  if (nextUnassigned !== -1) {
    startAssigning(nextUnassigned);
  } else {
    document.querySelector('.reschedule-bookings-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function formatDateForComparison(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function closeManualRescheduleModal() {
  const modal = document.getElementById('manualRescheduleModal');
  modal.classList.remove('active');
  document.body.style.overflow = 'auto';
  
  affectedBookingsForReschedule = [];
  pendingClosureData = null;
  selectedRescheduleDate = null;
  selectedRescheduleTime = null;
  currentRescheduleBookingIndex = null;
  temporaryAssignments = []; 
  
  document.getElementById('closeDayForm').reset();
  document.getElementById('timeSlotGroup').style.display = 'none';
}

async function confirmAllReschedules() {
  const btn = document.getElementById('confirmAllReschedules');
  btn.disabled = true;
  btn.textContent = 'Processing...';
  
  try {
    for (let i = 0; i < affectedBookingsForReschedule.length; i++) {
      const booking = affectedBookingsForReschedule[i];
      if (!booking.newDate || !booking.newTime) {
        alert(`Please assign a new schedule for ${booking.fullName} before confirming.`);
        btn.disabled = false;
        btn.textContent = 'Save All Reschedules & Send Emails';
        
        const bookingElement = document.querySelector(`[data-index="${i}"]`);
        bookingElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }
    
    await saveScheduleClosure(
      pendingClosureData.type,
      pendingClosureData.date,
      pendingClosureData.timeSlots,
      pendingClosureData.reason
    );
    
    for (const booking of affectedBookingsForReschedule) {
      const bookingRef = doc(db, 'tbiBookings', booking.id);
      await updateDoc(bookingRef, {
        oldDate: booking.date,
        oldTimeSlot: booking.timeSlot,
        date: booking.newDate,
        timeSlot: booking.newTime,
        timeSlotDisplay: timeSlotDisplay[booking.newTime],
        status: 'rescheduled',
        rescheduleReason: `Admin closed schedule: ${pendingClosureData.reason}`,
        rescheduledAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      
      sendRescheduleEmail(booking, booking.newDate, booking.newTime, `Admin closed schedule: ${pendingClosureData.reason}`);
    }
    
    alert(`Schedule closed and ${affectedBookingsForReschedule.length} booking(s) rescheduled successfully! Gmail compose windows opened for email notifications.`);
    
    closeManualRescheduleModal();
    loadClosedSchedules();
    loadBookings();
    
    setTimeout(() => location.reload(), 2000);
    
  } catch (error) {
    console.error('Error confirming reschedules:', error);
    alert('Failed to process reschedules. Please try again.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save All Reschedules & Send Emails';
  }
}

window.removeClosure = async function(closureId) {
  if (!confirm('Are you sure you want to remove this closure? The time slots will become available again.')) {
    return;
  }
  
  try {
    await deleteDoc(doc(db, 'closedSchedules', closureId));
    alert('Closure removed successfully!');
    loadClosedSchedules();
  } catch (error) {
    console.error('Error removing closure:', error);
    alert('Failed to remove closure.');
  }
};

window.confirmBooking = async function(bookingId) {
  if (!confirm('Confirm this booking?')) return;
  
  try {
    const booking = allBookings.find(b => b.id === bookingId);
    
    const bookingRef = doc(db, 'tbiBookings', bookingId);
    await updateDoc(bookingRef, {
      status: 'confirmed',
      confirmedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    
    sendApprovalEmail(booking);
    
    alert('Booking confirmed successfully! Gmail compose window opened for confirmation email.');
    loadBookings();
    setTimeout(() => location.reload(), 1500);
  } catch (error) {
    console.error('Error confirming booking:', error);
    alert('Failed to confirm booking.');
  }
};

function sendApprovalEmail(booking) {
  const recipientEmail = booking.email;
  const clientName = booking.fullName || 'Client';
  const serviceName = booking.serviceType || 'TBI Assessment';
  const projectName = booking.projectName || 'your project';
  
  const subject = encodeURIComponent(`Booking Confirmed: ${serviceName} at UC InTTO`);
  const body = encodeURIComponent(
`Dear ${clientName},

Great news! Your booking at UC InTTO has been CONFIRMED.

BOOKING DETAILS:
• Service: ${serviceName}
• Date: ${formatDate(booking.date)}
• Time: ${timeSlotDisplay[booking.timeSlot]}
• Project: ${projectName}
• Booking ID: #${booking.id.substring(0, 8)}

WHAT TO BRING:
• Valid ID
• Project documentation (if applicable)
• Notebook and pen for taking notes
• Any materials related to your project

LOCATION:
UC InTTO Office
UC Legarda, Reeds Mercury Drugstore 2gueyo2

IMPORTANT REMINDERS:
• Please arrive 5-10 minutes before your scheduled time
• If you need to reschedule, please inform us at least 24 hours in advance
• Prepare questions and materials relevant to your ${serviceName.toLowerCase()}

We look forward to seeing you and supporting your innovation journey!

If you have any questions, feel free to contact us.

Best regards,
UC InTTO Team
University of the Cordilleras
Innovation & Technology Transfer Office

Contact: intto@uc-bcf.edu.ph`
  );
  
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${recipientEmail}&su=${subject}&body=${body}`;
  window.open(gmailUrl, '_blank');
}

window.completeBooking = async function(bookingId) {
  if (!confirm('Mark this booking as completed?')) return;
  
  try {
    const bookingRef = doc(db, 'tbiBookings', bookingId);
    await updateDoc(bookingRef, {
      status: 'completed',
      completedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    
    alert('Booking marked as completed!');
    loadBookings();
    setTimeout(() => location.reload(), 500);
  } catch (error) {
    console.error('Error completing booking:', error);
    alert('Failed to complete booking.');
  }
};

window.cancelBooking = async function(bookingId) {
  const reason = prompt('Enter reason for cancellation:');
  if (!reason) return;
  
  try {
    const booking = allBookings.find(b => b.id === bookingId);
    
    const bookingRef = doc(db, 'tbiBookings', bookingId);
    await updateDoc(bookingRef, {
      status: 'cancelled',
      cancellationReason: reason,
      cancelledAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    
    sendRejectionEmail(booking, reason);
    
    alert('Booking cancelled successfully! Gmail compose window opened for cancellation email.');
    loadBookings();
    setTimeout(() => location.reload(), 1500);
  } catch (error) {
    console.error('Error cancelling booking:', error);
    alert('Failed to cancel booking.');
  }
};

function sendRejectionEmail(booking, reason) {
  const recipientEmail = booking.email;
  const clientName = booking.fullName || 'Client';
  const serviceName = booking.serviceType || 'TBI Assessment';
  const projectName = booking.projectName || 'your project';
  
  const subject = encodeURIComponent(`Booking Cancelled: ${serviceName} at UC InTTO`);
  const body = encodeURIComponent(
`Dear ${clientName},

We regret to inform you that your booking at UC InTTO has been CANCELLED.

CANCELLED BOOKING DETAILS:
• Service: ${serviceName}
• Date: ${formatDate(booking.date)}
• Time: ${timeSlotDisplay[booking.timeSlot]}
• Project: ${projectName}
• Booking ID: #${booking.id.substring(0, 8)}

CANCELLATION REASON:
${reason}

NEXT STEPS:
We apologize for any inconvenience this may cause. You are welcome to submit a new booking request at your convenience.

To book a new appointment:
1. Visit our booking portal at: https://intto.uc-bcf.edu.ph/tbi-assessment.html
2. Select your preferred date and time slot
3. Fill out the required information
4. Submit your booking request

Alternative options:
• You may contact us directly to discuss alternative arrangements
• Email us at intto@uc-bcf.edu.ph for assistance
• Visit our office during business hours (Monday-Saturday, 8AM-5PM)

We appreciate your understanding and look forward to serving you in the future.

Best regards,
UC InTTO Team
University of the Cordilleras
Innovation & Technology Transfer Office

Contact: intto@uc-bcf.edu.ph
Location: UC Legarda, Reeds Mercury Drugstore 2gueyo2`
  );
  
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${recipientEmail}&su=${subject}&body=${body}`;
  window.open(gmailUrl, '_blank');
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

function formatTimestamp(timestamp) {
  if (!timestamp) return '-';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function showError(message) {
  alert(message);
}
let currentWeekStart = new Date();
currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay() + 1); 

document.getElementById('openCalendarViewModal')?.addEventListener('click', () => {
  openCalendarView();
});

document.getElementById('closeCalendarViewModal')?.addEventListener('click', () => {
  closeCalendarView();
});

document.getElementById('prevWeek')?.addEventListener('click', () => {
  currentWeekStart.setDate(currentWeekStart.getDate() - 7);
  renderCalendarView();
});

document.getElementById('nextWeek')?.addEventListener('click', () => {
  currentWeekStart.setDate(currentWeekStart.getDate() + 7);
  renderCalendarView();
});

function openCalendarView() {
  document.getElementById('calendarViewModal').style.display = 'flex';
  renderCalendarView();
}

function closeCalendarView() {
  document.getElementById('calendarViewModal').style.display = 'none';
}

async function renderCalendarView() {
  const calendarBody = document.getElementById('calendarViewBody');
  const weekDisplay = document.getElementById('calendarWeekDisplay');
  
  const weekEnd = new Date(currentWeekStart);
  weekEnd.setDate(weekEnd.getDate() + 5); 
  
  const weekStartStr = currentWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const weekEndStr = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  weekDisplay.textContent = `Week of ${weekStartStr} - ${weekEndStr}`;
  
  const weekDates = [];
  for (let i = 0; i < 6; i++) {
    const date = new Date(currentWeekStart);
    date.setDate(date.getDate() + i);
    weekDates.push(date);
  }
  
  const timeSlots = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', 
                      '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', 
                      '16:00', '16:30'];
  
  let html = '';
  timeSlots.forEach(timeSlot => {
    html += `<tr>`;
    html += `<td class="time-slot-cell">${timeSlotDisplay[timeSlot]}</td>`;
    
    weekDates.forEach(date => {
      const dateStr = date.toISOString().split('T')[0];
      const cellData = getCalendarCellData(dateStr, timeSlot);
      html += `<td>${cellData}</td>`;
    });
    
    html += `</tr>`;
  });
  
  calendarBody.innerHTML = html;
}

function getCalendarCellData(dateStr, timeSlot) {
  const closedSlot = closedSchedules.find(cs => {
    const closedDate = cs.date;
    if (closedDate !== dateStr) return false;
    
    if (cs.type === 'full-day') return true;
    if (cs.type === 'specific-hours' && cs.timeSlots?.includes(timeSlot)) return true;
    return false;
  });
  
  if (closedSlot) {
    return `
      <div class="calendar-slot closed">
        <div class="closed-info">
          <i class="fa-solid fa-ban"></i> CLOSED
          <div class="closed-reason">${closedSlot.reason || 'No reason provided'}</div>
        </div>
      </div>
    `;
  }
  
  // PRIORITY CHECK:
  // If an ACTIVE booking exists, show it.
  const activeBooking = allBookings.find(b => 
    b.date === dateStr && 
    b.timeSlot === timeSlot &&
    ['pending', 'confirmed', 'rescheduled', 'completed'].includes(b.status)
  );

  // If we find an active booking, we return that.
  if (activeBooking) {
    return `
      <div class="calendar-slot booked" onclick="viewBooking('${activeBooking.id}')">
        <div class="booking-info">
          <div class="booking-name">${activeBooking.fullName}</div>
          <div class="booking-service">${activeBooking.serviceType}</div>
          <span class="booking-status ${activeBooking.status}">${activeBooking.status.toUpperCase()}</span>
        </div>
      </div>
    `;
  } 
  
  // If NO active booking is found, we fall through here.
  // We explicitly DO NOT check for or render 'cancelled' bookings.
  // This effectively hides cancelled bookings and shows the slot as Available.
  
  return `
    <div class="calendar-slot available">
      <div style="color: #999; font-size: 12px;">Available</div>
    </div>
  `;
}

document.getElementById('calendarViewModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'calendarViewModal') {
    closeCalendarView();
  }
});