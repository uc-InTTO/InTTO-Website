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

// Time slot display mapping
const timeSlotDisplay = {
  '08:00': '8AM - 9AM',
  '09:00': '9AM - 10AM',
  '10:00': '10AM - 11AM',
  '11:00': '11AM - 12NN',
  '13:00': '1PM - 2PM',
  '14:00': '2PM - 3PM',
  '15:00': '3PM - 4PM',
  '16:00': '4PM - 5PM'
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
  
  // Reschedule form
  document.getElementById('rescheduleForm').addEventListener('submit', handleReschedule);
  
  // Close Day form
  document.getElementById('closeDayForm').addEventListener('submit', handleCloseDay);
  
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

// Open reschedule modal
window.openRescheduleModal = function(bookingId) {
  currentBookingId = bookingId;
  const booking = allBookings.find(b => b.id === bookingId);
  if (!booking) return;
  
  document.getElementById('rescheduleClientName').textContent = booking.fullName;
  document.getElementById('rescheduleServiceType').textContent = booking.serviceType || 'TBI Assessment';
  document.getElementById('rescheduleCurrentDate').textContent = formatDate(booking.date);
  document.getElementById('rescheduleCurrentTime').textContent = timeSlotDisplay[booking.timeSlot] || booking.timeSlotDisplay;
  
  document.getElementById('rescheduleForm').reset();
  document.getElementById('rescheduleModal').classList.add('active');
  document.body.style.overflow = 'hidden';
};

// Close modals
function closeRescheduleModal() {
  document.getElementById('rescheduleModal').classList.remove('active');
  document.body.style.overflow = 'auto';
  currentBookingId = null;
}

function closeViewModal() {
  document.getElementById('viewModal').classList.remove('active');
  document.body.style.overflow = 'auto';
}

// Handle reschedule
async function handleReschedule(e) {
  e.preventDefault();
  
  if (!currentBookingId) return;
  
  const newDate = document.getElementById('newDate').value;
  const newTimeSlot = document.getElementById('newTimeSlot').value;
  const reason = document.getElementById('rescheduleReason').value;
  
  const submitBtn = e.target.querySelector('.btn-primary');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Rescheduling...';
  
  try {
    const booking = allBookings.find(b => b.id === currentBookingId);
    
    // Check if new slot is available
    const conflictingBookings = allBookings.filter(b => 
      b.date === newDate && 
      b.timeSlot === newTimeSlot && 
      b.id !== currentBookingId &&
      (b.status === 'pending' || b.status === 'confirmed')
    );
    
    if (conflictingBookings.length > 0) {
      alert('This time slot is already booked. Please select another time.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Confirm Reschedule & Send Email';
      return;
    }
    
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
    // Save to Firebase
    const closedRef = collection(db, 'closedSchedules');
    await addDoc(closedRef, {
      type: closeType,
      date: closeDate,
      timeSlots: timeSlots,
      reason: closeReason,
      createdAt: Timestamp.now()
    });
    
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
    setTimeout(() => location.reload(), 1000);
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
1. Visit our booking portal at: https://intto.uc-bcf.edu.ph/tbiAsses.html
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
