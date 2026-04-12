/**
 * Utility functions for exporting data to CSV/Excel formats
 */

/**
 * Convert array of objects to CSV string
 */
export const convertToCSV = (data, headers) => {
  if (!data || data.length === 0) return '';
  
  // Use provided headers or extract from first object
  const headerKeys = headers || Object.keys(data[0]);
  
  // Create header row
  const headerRow = headerKeys.join(',');
  
  // Create data rows
  const dataRows = data.map(item => {
    return headerKeys.map(key => {
      let value = item[key];
      
      // Handle null/undefined
      if (value === null || value === undefined) {
        value = '';
      }
      
      // Convert to string and escape commas/quotes
      value = String(value);
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        value = `"${value.replace(/"/g, '""')}"`;
      }
      
      return value;
    }).join(',');
  });
  
  return [headerRow, ...dataRows].join('\n');
};

/**
 * Download CSV file
 */
export const downloadCSV = (csvContent, filename) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

/**
 * Export hotels data to CSV
 */
export const exportHotelsToCSV = (hotels) => {
  const exportData = hotels.map(hotel => ({
    'Hotel Name': hotel.name,
    'City': hotel.city,
    'Country': hotel.country,
    'Contact Person': hotel.contactPerson,
    'Email': hotel.email,
    'Phone': hotel.phone,
    'Rooms': hotel.rooms,
    'Star Category': hotel.starCategory,
    'Contract Type': hotel.contractType,
    'Commission Rate': `${hotel.commissionRate}%`,
    'Status': hotel.status,
    'Total Groups': hotel.stats?.totalGroups || 0,
    'Total Revenue': `€${hotel.stats?.totalRevenue || 0}`,
    'Total Room Nights': hotel.stats?.totalRoomNights || 0
  }));
  
  const csv = convertToCSV(exportData);
  downloadCSV(csv, `hotels-export-${new Date().toISOString().split('T')[0]}.csv`);
};

/**
 * Export operators data to CSV
 */
export const exportOperatorsToCSV = (operators) => {
  const exportData = operators.map(operator => ({
    'Operator Name': operator.name,
    'Contact Person': operator.contactPerson,
    'Country': operator.country,
    'Type': operator.type,
    'Email': operator.email,
    'Phone': operator.phone,
    'Business Potential': operator.businessPotential,
    'Total Bookings': operator.stats?.totalBookings || 0,
    'Total Revenue': `€${operator.stats?.totalRevenue || 0}`,
    'Total Room Nights': operator.stats?.totalRoomNights || 0
  }));
  
  const csv = convertToCSV(exportData);
  downloadCSV(csv, `operators-export-${new Date().toISOString().split('T')[0]}.csv`);
};

/**
 * Export bookings data to CSV
 */
export const exportBookingsToCSV = (bookings) => {
  const exportData = bookings.map(booking => ({
    'Group Name': booking.groupName,
    'Hotel': booking.hotelName || booking.hotelId,
    'Operator': booking.operatorName || booking.operatorId,
    'Check In': booking.checkIn,
    'Check Out': booking.checkOut,
    'Nights': booking.nights,
    'Rooms': booking.rooms,
    'Rate per Night': `€${booking.ratePerNight}`,
    'Rate per Room': `€${booking.ratePerRoom || 0}`,
    'Total Revenue': `€${booking.totalRevenue}`,
    'Status': booking.status,
    'Notes': booking.notes || ''
  }));
  
  const csv = convertToCSV(exportData);
  downloadCSV(csv, `bookings-export-${new Date().toISOString().split('T')[0]}.csv`);
};

/**
 * Export commissions/revenue data to CSV
 */
export const exportRevenueToCSV = (commissions) => {
  const exportData = commissions.map(comm => ({
    'Group Name': comm.groupName,
    'Total Booking Value': `€${comm.totalBookingValue}`,
    'Margin per Room': `€${comm.marginPerRoom.toFixed(2)}`,
    'Total Margin': `€${comm.totalMargin.toFixed(2)}`,
    'Commission %': `${comm.commissionPercent}%`,
    'Commission Amount': `€${comm.commissionAmount.toFixed(2)}`,
    'Payment Status': comm.paymentStatus,
    'Payment Due Date': comm.paymentDueDate,
    'Paid Date': comm.paidDate || 'N/A'
  }));
  
  const csv = convertToCSV(exportData);
  downloadCSV(csv, `revenue-commission-export-${new Date().toISOString().split('T')[0]}.csv`);
};
