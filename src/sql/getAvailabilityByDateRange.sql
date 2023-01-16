SELECT
  DATE(booking.start) as date
FROM venue_schedule
INNER JOIN box
ON venue_schedule.venue_id = box.venue_id
INNER JOIN booking
ON DATE(booking.start) BETWEEN :startDate AND :endDate
  AND booking.deleted_at IS NULL
INNER JOIN box_booking
ON booking.id = box_booking.booking_id
  AND box.id = box_booking.box_id
INNER JOIN box_slot
ON box_slot.box_id = box.id
  AND venue_schedule.schedule_id = box_slot.schedule_id
  AND box_slot.duration = :duration
  AND box_slot.start < TIME(booking.end) + INTERVAL DATEDIFF(booking.end, booking.start) DAY
  AND box_slot.start + INTERVAL box_slot.duration MINUTE > TIME(booking.start) 
LEFT JOIN box_slot as slots
ON slots.box_id IN (SELECT id FROM box WHERE box.venue_id = venue_schedule.venue_id)
  AND slots.schedule_id = venue_schedule.schedule_id
  AND slots.duration = :duration
  WHERE venue_schedule.venue_id = :venueId
  AND venue_schedule.schedule_id = ACTIVE_SCHEDULE(:venueId, DATE(booking.start))
 GROUP BY DATE(booking.start)
 HAVING COUNT(DISTINCT(box_slot.id)) = COUNT(DISTINCT(slots.id))