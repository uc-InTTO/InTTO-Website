// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, updateDoc, addDoc, deleteDoc, query, where, orderBy, Timestamp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

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

// State
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
let temporaryAssignments = []; // Track slots assigned during current reschedule session

// Single booking reschedule state
let singleRescheduleCalendarDate = new Date();
let selectedSingleRescheduleDate = null;
let selectedSingleRescheduleTime = null;
let singleRescheduleAssigned = false;

// Time slot display mapping (30-minute intervals)
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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadBookings();
  loadClosedSchedules();
  setupEventListeners();
});

// Load all bookings from Firebase
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

    // Sort by date (descending - newest dates first) then by created date
    allBookings.sort((a, b) => {
      // First sort by date (descending)
      const dateCompare = new Date(b.date) - new Date(a.date);
      if (dateCompare !== 0) return dateCompare;
      
      // If dates are the same, sort by created date (oldest first for same day)
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

// Render bookings table
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
          ${booking.status === 'pending' || booking.status === 'confirmed' ? `
            <button class="btn-action btn-reschedule" onclick="openRescheduleModal('${booking.id}')">
              <i class="fa-solid fa-calendar-alt"></i> Reschedule
            </button>
          ` : ''}
          ${booking.status === 'pending' ? `
            <button class="btn-action btn-confirm" onclick="confirmBooking('${booking.id}')">
              <i class="fa-solid fa-check"></i> Confirm
            </button>
          ` : ''}
          ${booking.status === 'confirmed' ? `
            <button class="btn-action btn-complete" onclick="completeBooking('${booking.id}')">
              <i class="fa-solid fa-check-double"></i> Complete
            </button>
          ` : ''}
          ${booking.status === 'pending' || booking.status === 'confirmed' ? `
            <button class="btn-action btn-cancel" onclick="cancelBooking('${booking.id}')">
              <i class="fa-solid fa-times"></i> Cancel
            </button>
          ` : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

// Update statistics
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

// Setup event listeners
function setupEventListeners() {
  // Filters
  document.getElementById('statusFilter').addEventListener('change', applyFilters);
  document.getElementById('serviceFilter').addEventListener('change', applyFilters);
  document.getElementById('dateFilter').addEventListener('change', applyFilters);
  document.getElementById('searchFilter').addEventListener('input', applyFilters);
  document.getElementById('resetFilters').addEventListener('click', resetFilters);
  
  // Modal controls
  document.getElementById('closeRescheduleModal').addEventListener('click', closeRescheduleModal);
  document.getElementById('cancelReschedule').addEventListener('click', closeRescheduleModal);
  document.getElementById('closeViewModal').addEventListener('click', closeViewModal);
  
  // Close Day/Time Modal
  document.getElementById('openCloseDayModal').addEventListener('click', openCloseDayModal);
  document.getElementById('closeCloseDayModal').addEventListener('click', closeCloseDayModal);
  document.getElementById('cancelCloseDay').addEventListener('click', closeCloseDayModal);
  
  // Close Type Change
  document.getElementById('closeType').addEventListener('change', (e) => {
    const timeSlotGroup = document.getElementById('timeSlotGroup');
    if (e.target.value === 'specific-hours') {
      timeSlotGroup.style.display = 'block';
    } else {
      timeSlotGroup.style.display = 'none';
    }
  });
  
  // Close Day form
  document.getElementById('closeDayForm').addEventListener('submit', handleCloseDay);
  
  // Manual Reschedule Modal
  document.getElementById('closeManualRescheduleModal')?.addEventListener('click', closeManualRescheduleModal);
  document.getElementById('cancelManualReschedule')?.addEventListener('click', closeManualRescheduleModal);
  document.getElementById('confirmAllReschedules')?.addEventListener('click', confirmAllReschedules);
  
  // Reschedule Calendar Navigation
  document.getElementById('prevMonthReschedule')?.addEventListener('click', () => {
    rescheduleCalendarDate.setMonth(rescheduleCalendarDate.getMonth() - 1);
    renderRescheduleCalendar();
  });
  document.getElementById('nextMonthReschedule')?.addEventListener('click', () => {
    rescheduleCalendarDate.setMonth(rescheduleCalendarDate.getMonth() + 1);
    renderRescheduleCalendar();
  });
  
  // Single Reschedule Calendar Navigation
  document.getElementById('prevMonthSingleReschedule')?.addEventListener('click', () => {
    singleRescheduleCalendarDate.setMonth(singleRescheduleCalendarDate.getMonth() - 1);
    renderSingleRescheduleCalendar();
  });
  document.getElementById('nextMonthSingleReschedule')?.addEventListener('click', () => {
    singleRescheduleCalendarDate.setMonth(singleRescheduleCalendarDate.getMonth() + 1);
    renderSingleRescheduleCalendar();
  });
  
  // Single Reschedule Confirm
  document.getElementById('confirmSingleReschedule')?.addEventListener('click', handleSingleReschedule);
  
  // Close modals on outside click
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
  
  // Set minimum date for reschedule to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  document.getElementById('newDate').min = tomorrow.toISOString().split('T')[0];
  document.getElementById('closeDateStart').min = new Date().toISOString().split('T')[0];
}

// Apply filters
function applyFilters() {
  const statusFilter = document.getElementById('statusFilter').value;
  const serviceFilter = document.getElementById('serviceFilter').value;
  const dateFilter = document.getElementById('dateFilter').value;
  const searchFilter = document.getElementById('searchFilter').value.toLowerCase();
  
  filteredBookings = allBookings.filter(booking => {
    // Status filter
    if (statusFilter !== 'all' && booking.status !== statusFilter) return false;
    
    // Service filter
    if (serviceFilter !== 'all' && booking.serviceType !== serviceFilter) return false;
    
    // Date filter
    if (dateFilter && booking.date !== dateFilter) return false;
    
    // Search filter
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

  // Sort filtered bookings by date (descending - newest dates first) then by created date
  filteredBookings.sort((a, b) => {
    // First sort by date (descending)
    const dateCompare = new Date(b.date) - new Date(a.date);
    if (dateCompare !== 0) return dateCompare;
    
    // If dates are the same, sort by created date (oldest first for same day)
    const aCreated = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
    const bCreated = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
    return aCreated - bCreated;
  });
  
  renderBookings();
}

// Reset filters
function resetFilters() {
  document.getElementById('statusFilter').value = 'all';
  document.getElementById('serviceFilter').value = 'all';
  document.getElementById('dateFilter').value = '';
  document.getElementById('searchFilter').value = '';
  applyFilters();
}

// View booking details
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

// Open reschedule modal with calendar view
window.openRescheduleModal = function(bookingId) {
  currentBookingId = bookingId;
  const booking = allBookings.find(b => b.id === bookingId);
  if (!booking) return;
  
  document.getElementById('rescheduleClientName').textContent = booking.fullName;
  document.getElementById('rescheduleServiceType').textContent = booking.serviceType || 'TBI Assessment';
  document.getElementById('rescheduleCurrentDate').textContent = formatDate(booking.date);
  document.getElementById('rescheduleCurrentTime').textContent = timeSlotDisplay[booking.timeSlot] || booking.timeSlotDisplay;
  
  // Reset calendar state
  singleRescheduleCalendarDate = new Date();
  selectedSingleRescheduleDate = null;
  selectedSingleRescheduleTime = null;
  singleRescheduleAssigned = false;
  
  // Reset UI
  document.getElementById('assignedScheduleSingle').style.display = 'none';
  document.getElementById('assignBtnSingle').style.display = 'block';
  document.getElementById('timeSlotsReschedule').style.display = 'none';
  document.getElementById('rescheduleReason').value = '';
  
  // Render calendar
  renderSingleRescheduleCalendar();
  
  document.getElementById('rescheduleModal').classList.add('active');
  document.body.style.overflow = 'hidden';
};

// Close modals
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

// Handle single booking reschedule
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
    
    // Update booking in Firebase
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
    
    // Send email notification via Gmail
    sendRescheduleEmail(booking, newDate, newTimeSlot, reason);
    
    alert('Booking rescheduled successfully! Gmail compose window opened for email notification.');
    closeRescheduleModal();
    loadBookings();
    // Auto-reload to reflect changes
    setTimeout(() => location.reload(), 1500);
    
  } catch (error) {
    console.error('Error rescheduling booking:', error);
    alert('Failed to reschedule booking. Please try again.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Confirm Reschedule & Send Email';
  }
}

// Render single reschedule calendar
function renderSingleRescheduleCalendar() {
  const year = singleRescheduleCalendarDate.getFullYear();
  const month = singleRescheduleCalendarDate.getMonth();
  
  // Update month display
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
  document.getElementById('singleRescheduleMonthDisplay').textContent = `${monthNames[month]} ${year}`;
  
  // Get first day of month (adjusted for Mon-Sat week)
  const firstDay = new Date(year, month, 1).getDay();
  const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1; // Monday = 0, Sunday = 6
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarDays = document.getElementById('singleRescheduleCalendarDays');
  calendarDays.innerHTML = '';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Add empty cells for days before month starts (Mon-Sat only)
  for (let i = 0; i < adjustedFirstDay; i++) {
    const emptyDay = document.createElement('div');
    emptyDay.classList.add('mini-calendar-day', 'empty');
    calendarDays.appendChild(emptyDay);
  }
  
  // Add days of the month (Mon-Sat only, skip Sundays)
  for (let day = 1; day <= daysInMonth; day++) {
    const dayDate = new Date(year, month, day);
    const dayOfWeek = dayDate.getDay();
    const dateString = formatDateForComparison(dayDate);
    
    const dayElement = document.createElement('div');
    dayElement.classList.add('mini-calendar-day');
    dayElement.textContent = day;
    
    // Skip Sundays
    if (dayOfWeek === 0) {
      dayElement.classList.add('disabled');
      dayElement.style.display = 'none';
      calendarDays.appendChild(dayElement);
      continue;
    }
    
    // Check if day is in the past
    if (dayDate < today) {
      dayElement.classList.add('disabled');
    }
    // Check if day is fully closed
    else if (closedSchedules.some(cs => cs.date === dateString && cs.type === 'full-day')) {
      dayElement.classList.add('closed-day');
    }
    // Available day
    else {
      dayElement.addEventListener('click', () => selectSingleRescheduleDate(dayDate, dayElement));
      
      // Check if day has available slots
      const hasAvailableSlots = checkDayHasAvailableSlots(dateString);
      if (hasAvailableSlots) {
        dayElement.classList.add('has-slots');
      }
    }
    
    // Highlight selected date
    if (selectedSingleRescheduleDate && formatDateForComparison(selectedSingleRescheduleDate) === dateString) {
      dayElement.classList.add('selected-reschedule');
    }
    
    calendarDays.appendChild(dayElement);
  }
}

// Select a date in single reschedule calendar
function selectSingleRescheduleDate(date, element) {
  selectedSingleRescheduleDate = date;
  selectedSingleRescheduleTime = null;
  
  // Update calendar day selection
  document.querySelectorAll('#singleRescheduleCalendarDays .mini-calendar-day').forEach(day => {
    day.classList.remove('selected-reschedule');
  });
  element.classList.add('selected-reschedule');
  
  // Show time slots for selected date
  showSingleRescheduleTimeSlots(date);
}

// Show available time slots for single reschedule
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
    // Check if closed
    const isClosed = closedSchedules.some(cs => {
      if (cs.date !== dateString) return false;
      if (cs.type === 'full-day') return true;
      if (cs.type === 'specific-hours' && cs.timeSlots?.includes(slot)) return true;
      return false;
    });
    
    if (isClosed) {
      return `<div class="time-slot-reschedule closed">${timeSlotDisplay[slot]}<br><small>Closed</small></div>`;
    }
    
    // Check if booked (excluding current booking being rescheduled)
    const isBooked = allBookings.some(b => 
      b.date === dateString && 
      b.timeSlot === slot && 
      b.id !== currentBookingId &&
      (b.status === 'pending' || b.status === 'confirmed')
    );
    
    if (isBooked) {
      return `<div class="time-slot-reschedule booked">${timeSlotDisplay[slot]}<br><small>Booked</small></div>`;
    }
    
    // Available
    const selectedClass = (selectedSingleRescheduleTime === slot) ? 'selected-time' : '';
    return `<div class="time-slot-reschedule ${selectedClass}" onclick="selectSingleRescheduleTime('${slot}', this)">
      ${timeSlotDisplay[slot]}<br><small>Available</small>
    </div>`;
  }).join('');
  
  container.style.display = 'block';
}

// Select a time slot for single reschedule
window.selectSingleRescheduleTime = function(timeSlot, element) {
  if (!selectedSingleRescheduleDate) {
    alert('Please select a date first.');
    return;
  }
  
  selectedSingleRescheduleTime = timeSlot;
  
  // Update time slot selection
  document.querySelectorAll('.time-slot-reschedule').forEach(slot => {
    slot.classList.remove('selected-time');
  });
  element.classList.add('selected-time');
  
  // Auto-assign to the single booking
  assignSingleReschedule();
};

// Start assigning for single booking
window.startAssigningSingle = function() {
  // Reset state
  selectedSingleRescheduleDate = null;
  selectedSingleRescheduleTime = null;
  document.getElementById('timeSlotsReschedule').style.display = 'none';
  
  // Re-render calendar
  renderSingleRescheduleCalendar();
  
  // Scroll calendar into view
  document.querySelector('.reschedule-calendar-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// Reassign single booking
window.reassignSingleBooking = function() {
  startAssigningSingle();
};

// Assign selected slot to single booking
function assignSingleReschedule() {
  if (!selectedSingleRescheduleDate || !selectedSingleRescheduleTime) {
    return;
  }
  
  const dateString = formatDateForComparison(selectedSingleRescheduleDate);
  
  // Update UI to show assigned schedule
  document.getElementById('assignedScheduleSingle').style.display = 'block';
  document.getElementById('assignedDateSingle').textContent = formatDate(dateString);
  document.getElementById('assignedTimeSingle').textContent = timeSlotDisplay[selectedSingleRescheduleTime];
  document.getElementById('assignBtnSingle').style.display = 'none';
  
  singleRescheduleAssigned = true;
  
  // Hide time slots
  document.getElementById('timeSlotsReschedule').style.display = 'none';
  
  // Scroll to reason field
  document.querySelector('#rescheduleReason')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Send reschedule email via Gmail
function sendRescheduleEmail(booking, newDate, newTimeSlot, reason) {
  const recipientEmail = booking.email;
  const clientName = booking.fullName || 'Client';
  const serviceName = booking.serviceType || 'TBI Assessment';
  const projectName = booking.projectName || 'your project';
  
  const subject = encodeURIComponent(`Important: Your ${serviceName} Booking Has Been Rescheduled`);
  const body = encodeURIComponent(
`Dear ${clientName},

We are writing to inform you that your booking at UC InTTO has been rescheduled.

PREVIOUS SCHEDULE:
• Service: ${serviceName}
• Date: ${formatDate(booking.date)}
• Time: ${timeSlotDisplay[booking.timeSlot]}
• Project: ${projectName}

NEW SCHEDULE:
• Service: ${serviceName}
• Date: ${formatDate(newDate)}
• Time: ${timeSlotDisplay[newTimeSlot]}
• Project: ${projectName}

REASON FOR RESCHEDULING:
${reason}

We sincerely apologize for any inconvenience this may cause. If the new schedule does not work for you, please contact us immediately so we can find an alternative time that suits your availability.

If you have any questions or concerns, please don't hesitate to reach out to us.

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

// Load closed schedules
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
    
    renderClosedSchedules();
  } catch (error) {
    console.error('Error loading closed schedules:', error);
  }
}

// Render closed schedules list
function renderClosedSchedules() {
  const container = document.getElementById('closedScheduleItems');
  
  if (closedSchedules.length === 0) {
    container.innerHTML = '<p class="loading-text">No closed schedules</p>';
    return;
  }
  
  container.innerHTML = closedSchedules.map(schedule => `
    <div class="closed-schedule-item">
      <div class="schedule-header">
        <span class="schedule-date">${formatDate(schedule.date)}</span>
        <button class="btn-remove-closure" onclick="removeClosure('${schedule.id}')">
          <i class="fa-solid fa-trash"></i> Remove
        </button>
      </div>
      <div class="schedule-time">
        ${schedule.type === 'full-day' ? 'Full Day Closed' : `Time Slots: ${schedule.timeSlots.map(t => timeSlotDisplay[t]).join(', ')}`}
      </div>
      <div class="schedule-reason">
        Reason: ${schedule.reason}
      </div>
    </div>
  `).join('');
}

// Open close day modal
function openCloseDayModal() {
  document.getElementById('closeDayForm').reset();
  document.getElementById('timeSlotGroup').style.display = 'none';
  loadClosedSchedules();
  document.getElementById('closeDayModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

// Close close day modal
function closeCloseDayModal() {
  document.getElementById('closeDayModal').classList.remove('active');
  document.body.style.overflow = 'auto';
}

// Handle close day form submission
async function handleCloseDay(e) {
  e.preventDefault();
  
  const closeType = document.getElementById('closeType').value;
  const closeDate = document.getElementById('closeDateStart').value;
  const closeReason = document.getElementById('closeReason').value;
  
  let timeSlots = [];
  if (closeType === 'specific-hours') {
    const checkedBoxes = document.querySelectorAll('input[name="closeTimeSlot"]:checked');
    timeSlots = Array.from(checkedBoxes).map(cb => cb.value);
    
    if (timeSlots.length === 0) {
      alert('Please select at least one time slot to close.');
      return;
    }
  }
  
  const submitBtn = e.target.querySelector('.btn-primary');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Processing...';
  
  try {
    // Check for existing bookings on this date/time
    const affectedBookings = allBookings.filter(booking => {
      if (booking.date !== closeDate) return false;
      if (booking.status === 'cancelled' || booking.status === 'completed') return false;
      
      // For full-day closure
      if (closeType === 'full-day') return true;
      
      // For specific hours closure
      if (closeType === 'specific-hours' && timeSlots.includes(booking.timeSlot)) return true;
      
      return false;
    });
    
    // If there are affected bookings, show manual reschedule modal
    if (affectedBookings.length > 0) {
      pendingClosureData = {
        type: closeType,
        date: closeDate,
        timeSlots: timeSlots,
        reason: closeReason
      };
      
      affectedBookingsForReschedule = affectedBookings;
      
      // Close current modal
      closeCloseDayModal();
      
      // Open manual reschedule modal
      openManualRescheduleModal();
      
      submitBtn.disabled = false;
      submitBtn.textContent = 'Confirm Closure';
      return;
    }
    
    // No affected bookings - proceed with closure
    await saveScheduleClosure(closeType, closeDate, timeSlots, closeReason);
    
    alert('Schedule closed successfully!');
    loadClosedSchedules();
    document.getElementById('closeDayForm').reset();
    document.getElementById('timeSlotGroup').style.display = 'none';
    
  } catch (error) {
    console.error('Error closing schedule:', error);
    alert('Failed to close schedule. Please try again.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Confirm Closure';
  }
}

// Save schedule closure to Firebase
async function saveScheduleClosure(type, date, timeSlots, reason) {
  const closedRef = collection(db, 'closedSchedules');
  await addDoc(closedRef, {
    type: type,
    date: date,
    timeSlots: timeSlots,
    reason: reason,
    createdAt: Timestamp.now()
  });
}

// Open manual reschedule modal
function openManualRescheduleModal() {
  const modal = document.getElementById('manualRescheduleModal');
  const container = document.getElementById('affectedBookingsList');
  
  // Reset calendar to current month
  rescheduleCalendarDate = new Date();
  selectedRescheduleDate = null;
  selectedRescheduleTime = null;
  temporaryAssignments = []; // Clear temporary assignments when opening modal
  
  // Render calendar
  renderRescheduleCalendar();
  
  // Render affected bookings
  container.innerHTML = affectedBookingsForReschedule.map((booking, index) => `
    <div class="affected-booking-item" data-booking-id="${booking.id}" data-index="${index}">
      <div class="booking-current-info">
        <h4>${booking.fullName}</h4>
        <div class="booking-info-grid">
          <div class="booking-info-item">
            <strong>Service:</strong>
            <span>${booking.serviceType || 'TBI Assessment'}</span>
          </div>
          <div class="booking-info-item">
            <strong>Current:</strong>
            <span>${formatDate(booking.date)} at ${timeSlotDisplay[booking.timeSlot]}</span>
          </div>
          <div class="booking-info-item">
            <strong>Project:</strong>
            <span>${booking.projectName || '-'}</span>
          </div>
        </div>
      </div>
      
      <div id="assignedSchedule_${index}" class="booking-assigned-schedule" style="display: none;">
        <h5><i class="fa-solid fa-calendar-check"></i> New Schedule Assigned</h5>
        <div class="assigned-info">
          <div><strong>Date:</strong> <span id="assignedDate_${index}"></span></div>
          <div><strong>Time:</strong> <span id="assignedTime_${index}"></span></div>
        </div>
        <button type="button" class="btn-reassign" onclick="reassignBooking(${index})">
          <i class="fa-solid fa-repeat"></i> Change Schedule
        </button>
      </div>
      
      <button type="button" class="btn-primary" style="width: 100%; margin-top: 10px;" 
              id="assignBtn_${index}" onclick="startAssigning(${index})">
        <i class="fa-solid fa-calendar-plus"></i> Assign New Schedule
      </button>
    </div>
  `).join('');
  
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

// Render reschedule calendar
function renderRescheduleCalendar() {
  const year = rescheduleCalendarDate.getFullYear();
  const month = rescheduleCalendarDate.getMonth();
  
  // Update month display
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
  document.getElementById('rescheduleMonthDisplay').textContent = `${monthNames[month]} ${year}`;
  
  // Get first day of month (adjusted for Mon-Sat week)
  const firstDay = new Date(year, month, 1).getDay();
  const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1; // Monday = 0, Sunday = 6
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarDays = document.getElementById('rescheduleCalendarDays');
  calendarDays.innerHTML = '';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Add empty cells for days before month starts (Mon-Sat only)
  for (let i = 0; i < adjustedFirstDay; i++) {
    const emptyDay = document.createElement('div');
    emptyDay.classList.add('mini-calendar-day', 'empty');
    calendarDays.appendChild(emptyDay);
  }
  
  // Add days of the month (Mon-Sat only, skip Sundays)
  for (let day = 1; day <= daysInMonth; day++) {
    const dayDate = new Date(year, month, day);
    const dayOfWeek = dayDate.getDay();
    const dateString = formatDateForComparison(dayDate);
    
    const dayElement = document.createElement('div');
    dayElement.classList.add('mini-calendar-day');
    dayElement.textContent = day;
    
    // Skip Sundays
    if (dayOfWeek === 0) {
      dayElement.classList.add('disabled');
      dayElement.style.display = 'none';
      calendarDays.appendChild(dayElement);
      continue;
    }
    
    // Check if day is in the past
    if (dayDate < today) {
      dayElement.classList.add('disabled');
    }
    // Check if day is fully closed
    else if (closedSchedules.some(cs => cs.date === dateString && cs.type === 'full-day')) {
      dayElement.classList.add('closed-day');
    }
    // Available day
    else {
      dayElement.addEventListener('click', () => selectRescheduleDate(dayDate, dayElement));
      
      // Check if day has available slots
      const hasAvailableSlots = checkDayHasAvailableSlots(dateString);
      if (hasAvailableSlots) {
        dayElement.classList.add('has-slots');
      }
    }
    
    // Highlight selected date
    if (selectedRescheduleDate && formatDateForComparison(selectedRescheduleDate) === dateString) {
      dayElement.classList.add('selected-reschedule');
    }
    
    calendarDays.appendChild(dayElement);
  }
}

// Check if a day has any available slots
function checkDayHasAvailableSlots(dateString) {
  const timeSlots = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];
  
  for (const slot of timeSlots) {
    const isClosed = closedSchedules.some(cs => {
      if (cs.date !== dateString) return false;
      if (cs.type === 'full-day') return true;
      if (cs.type === 'specific-hours' && cs.timeSlots?.includes(slot)) return true;
      return false;
    });
    
    if (isClosed) continue;
    
    const isBooked = allBookings.some(b => 
      b.date === dateString && 
      b.timeSlot === slot && 
      (b.status === 'pending' || b.status === 'confirmed')
    );
    
    if (!isBooked) return true; // At least one slot available
  }
  
  return false;
}

// Select a date in reschedule calendar
function selectRescheduleDate(date, element) {
  selectedRescheduleDate = date;
  selectedRescheduleTime = null;
  
  // Update calendar day selection
  document.querySelectorAll('.mini-calendar-day').forEach(day => {
    day.classList.remove('selected-reschedule');
  });
  element.classList.add('selected-reschedule');
  
  // Show time slots for selected date
  showRescheduleTimeSlots(date);
}

// Show available time slots for selected date
function showRescheduleTimeSlots(date) {
  const dateString = formatDateForComparison(date);
  const container = document.getElementById('timeSlotsReschedule');
  const grid = document.getElementById('timeSlotsGridReschedule');
  const dateDisplay = document.getElementById('selectedDateReschedule');
  
  dateDisplay.textContent = formatDate(dateString);
  
  const timeSlots = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', 
                      '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', 
                      '16:00', '16:30'];
  
  grid.innerHTML = timeSlots.map(slot => {
    // Check if closed
    const isClosed = closedSchedules.some(cs => {
      if (cs.date !== dateString) return false;
      if (cs.type === 'full-day') return true;
      if (cs.type === 'specific-hours' && cs.timeSlots?.includes(slot)) return true;
      return false;
    });
    
    if (isClosed) {
      return `<div class="time-slot-reschedule closed">${timeSlotDisplay[slot]}<br><small>Closed</small></div>`;
    }
    
    // Check if booked
    const isBooked = allBookings.some(b => 
      b.date === dateString && 
      b.timeSlot === slot && 
      (b.status === 'pending' || b.status === 'confirmed')
    );
    
    // Check if temporarily assigned in this reschedule session
    const isTemporarilyAssigned = temporaryAssignments.some(ta => 
      ta.date === dateString && ta.timeSlot === slot
    );
    
    if (isBooked || isTemporarilyAssigned) {
      return `<div class="time-slot-reschedule booked">${timeSlotDisplay[slot]}<br><small>Booked</small></div>`;
    }
    
    // Available
    const selectedClass = (selectedRescheduleTime === slot) ? 'selected-time' : '';
    return `<div class="time-slot-reschedule ${selectedClass}" onclick="selectRescheduleTime('${slot}', this)">
      ${timeSlotDisplay[slot]}<br><small>Available</small>
    </div>`;
  }).join('');
  
  container.style.display = 'block';
}

// Select a time slot
window.selectRescheduleTime = function(timeSlot, element) {
  if (!selectedRescheduleDate) {
    alert('Please select a date first.');
    return;
  }
  
  selectedRescheduleTime = timeSlot;
  
  // Update time slot selection
  document.querySelectorAll('.time-slot-reschedule').forEach(slot => {
    slot.classList.remove('selected-time');
  });
  element.classList.add('selected-time');
  
  // If we're in assignment mode, assign to current booking
  if (currentRescheduleBookingIndex !== null) {
    assignSelectedSlot();
  }
};

// Start assigning a schedule to a booking
window.startAssigning = function(index) {
  currentRescheduleBookingIndex = index;
  
  // Highlight the booking being assigned
  document.querySelectorAll('.affected-booking-item').forEach((item, i) => {
    if (i === index) {
      item.style.border = '3px solid #166647';
      item.style.background = '#f0f9f0';
    } else {
      item.style.border = '1px solid #dee2e6';
      item.style.background = '#f8f9fa';
    }
  });
  
  // Scroll calendar into view
  document.querySelector('.reschedule-calendar-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// Reassign a booking (change previously assigned schedule)
window.reassignBooking = function(index) {
  startAssigning(index);
};

// Assign selected slot to current booking
function assignSelectedSlot() {
  if (currentRescheduleBookingIndex === null || !selectedRescheduleDate || !selectedRescheduleTime) {
    return;
  }
  
  const index = currentRescheduleBookingIndex;
  const dateString = formatDateForComparison(selectedRescheduleDate);
  
  // Remove previous assignment from temporary assignments if exists
  const previousAssignment = temporaryAssignments.findIndex(ta => ta.bookingIndex === index);
  if (previousAssignment !== -1) {
    temporaryAssignments.splice(previousAssignment, 1);
  }
  
  // Add new assignment to temporary assignments
  temporaryAssignments.push({
    bookingIndex: index,
    date: dateString,
    timeSlot: selectedRescheduleTime
  });
  
  // Update UI to show assigned schedule
  document.getElementById(`assignedSchedule_${index}`).style.display = 'block';
  document.getElementById(`assignedDate_${index}`).textContent = formatDate(dateString);
  document.getElementById(`assignedTime_${index}`).textContent = timeSlotDisplay[selectedRescheduleTime];
  document.getElementById(`assignBtn_${index}`).style.display = 'none';
  
  // Store assignment
  affectedBookingsForReschedule[index].newDate = dateString;
  affectedBookingsForReschedule[index].newTime = selectedRescheduleTime;
  
  // Reset highlight
  document.querySelectorAll('.affected-booking-item').forEach(item => {
    item.style.border = '1px solid #dee2e6';
    item.style.background = '#f8f9fa';
  });
  
  currentRescheduleBookingIndex = null;
  selectedRescheduleDate = null;
  selectedRescheduleTime = null;
  
  // Hide time slots
  document.getElementById('timeSlotsReschedule').style.display = 'none';
  
  // Re-render calendar to clear selection
  renderRescheduleCalendar();
  
  // Scroll to next unassigned booking
  const nextUnassigned = affectedBookingsForReschedule.findIndex((b, i) => i > index && !b.newDate);
  if (nextUnassigned !== -1) {
    startAssigning(nextUnassigned);
  } else {
    // All assigned, scroll to bookings section
    document.querySelector('.reschedule-bookings-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// Format date for comparison (YYYY-MM-DD)
function formatDateForComparison(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Close manual reschedule modal
function closeManualRescheduleModal() {
  const modal = document.getElementById('manualRescheduleModal');
  modal.classList.remove('active');
  document.body.style.overflow = 'auto';
  
  // Reset state
  affectedBookingsForReschedule = [];
  pendingClosureData = null;
  selectedRescheduleDate = null;
  selectedRescheduleTime = null;
  currentRescheduleBookingIndex = null;
  temporaryAssignments = []; // Clear temporary assignments
  
  // Re-open close day modal if user wants to try again
  document.getElementById('closeDayForm').reset();
  document.getElementById('timeSlotGroup').style.display = 'none';
}

// Confirm all reschedules
async function confirmAllReschedules() {
  const btn = document.getElementById('confirmAllReschedules');
  btn.disabled = true;
  btn.textContent = 'Processing...';
  
  try {
    // Check all bookings have assignments
    for (let i = 0; i < affectedBookingsForReschedule.length; i++) {
      const booking = affectedBookingsForReschedule[i];
      if (!booking.newDate || !booking.newTime) {
        alert(`Please assign a new schedule for ${booking.fullName} before confirming.`);
        btn.disabled = false;
        btn.textContent = 'Save All Reschedules & Send Emails';
        
        // Scroll to unassigned booking
        const bookingElement = document.querySelector(`[data-index="${i}"]`);
        bookingElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }
    
    // Save schedule closure first
    await saveScheduleClosure(
      pendingClosureData.type,
      pendingClosureData.date,
      pendingClosureData.timeSlots,
      pendingClosureData.reason
    );
    
    // Update all bookings
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
      
      // Send reschedule email
      sendRescheduleEmail(booking, booking.newDate, booking.newTime, `Admin closed schedule: ${pendingClosureData.reason}`);
    }
    
    alert(`Schedule closed and ${affectedBookingsForReschedule.length} booking(s) rescheduled successfully! Gmail compose windows opened for email notifications.`);
    
    closeManualRescheduleModal();
    loadClosedSchedules();
    loadBookings();
    
    // Reload page to reflect changes
    setTimeout(() => location.reload(), 2000);
    
  } catch (error) {
    console.error('Error confirming reschedules:', error);
    alert('Failed to process reschedules. Please try again.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save All Reschedules & Send Emails';
  }
}

// Remove closure
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

// Confirm booking
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
    
    // Send approval email via Gmail
    sendApprovalEmail(booking);
    
    alert('Booking confirmed successfully! Gmail compose window opened for confirmation email.');
    loadBookings();
    // Auto-reload to reflect changes
    setTimeout(() => location.reload(), 1500);
  } catch (error) {
    console.error('Error confirming booking:', error);
    alert('Failed to confirm booking.');
  }
};

// Send approval email via Gmail
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

// Complete booking
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
    // Auto-reload to reflect changes
    setTimeout(() => location.reload(), 500);
  } catch (error) {
    console.error('Error completing booking:', error);
    alert('Failed to complete booking.');
  }
};

// Cancel booking
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
    
    // Send rejection email via Gmail
    sendRejectionEmail(booking, reason);
    
    alert('Booking cancelled successfully! Gmail compose window opened for cancellation email.');
    loadBookings();
    // Auto-reload to reflect changes
    setTimeout(() => location.reload(), 1500);
  } catch (error) {
    console.error('Error cancelling booking:', error);
    alert('Failed to cancel booking.');
  }
};

// Send rejection/cancellation email via Gmail
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

// Utility functions
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
// Calendar View Modal Management
let currentWeekStart = new Date();
currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay() + 1); // Start from Monday

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
  
  // Calculate week end date
  const weekEnd = new Date(currentWeekStart);
  weekEnd.setDate(weekEnd.getDate() + 5); // 6 days for Mon-Sat
  
  // Update week display
  const weekStartStr = currentWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const weekEndStr = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  weekDisplay.textContent = `Week of ${weekStartStr} - ${weekEndStr}`;
  
  // Get week dates
  const weekDates = [];
  for (let i = 0; i < 6; i++) {
    const date = new Date(currentWeekStart);
    date.setDate(date.getDate() + i);
    weekDates.push(date);
  }
  
  // Time slots (30-minute intervals)
  const timeSlots = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', 
                      '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', 
                      '16:00', '16:30'];
  
  // Build calendar HTML
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
  // Check if this slot is closed
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
  
  // Check if there's a booking for this slot
  const booking = allBookings.find(b => 
    b.date === dateStr && 
    b.timeSlot === timeSlot &&
    b.status !== 'cancelled'
  );
  
  if (booking) {
    return `
      <div class="calendar-slot booked" onclick="viewBooking('${booking.id}')">
        <div class="booking-info">
          <div class="booking-name">${booking.fullName}</div>
          <div class="booking-service">${booking.serviceType}</div>
          <span class="booking-status ${booking.status}">${booking.status.toUpperCase()}</span>
        </div>
      </div>
    `;
  }
  
  // Available slot
  return `
    <div class="calendar-slot available">
      <div style="color: #999; font-size: 12px;">Available</div>
    </div>
  `;
}

// Close modal when clicking outside
document.getElementById('calendarViewModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'calendarViewModal') {
    closeCalendarView();
  }
});
