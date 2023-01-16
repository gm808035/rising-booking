SELECT
  box_slot.start,
  box_slot.duration,
  box.id AS box_id,
  box_slot.id AS box_slot_id,
  price.type AS type,
  box_slot_link.id AS linked_box_slot_id,
  CAST(FLOOR(price.price * (box_slot.duration / 60)) AS UNSIGNED) AS price
FROM venue_schedule
INNER JOIN open_time
ON venue_schedule.schedule_id = open_time.schedule_id
INNER JOIN price
ON open_time.id = price.open_time_id
INNER JOIN box
ON venue_schedule.venue_id = box.venue_id
INNER JOIN box_slot
ON box_slot.box_id = box.id
  AND box_slot.schedule_id = venue_schedule.schedule_id 
  AND box_slot.start >= price.start
  AND box_slot.start <= price.end
LEFT JOIN box_slot_link
ON box_slot.id = box_slot_link.box_slot_id
OR box_slot.id = box_slot_link.linked_box_slot_id
LEFT JOIN (
  SELECT
    booking.*,
    box_booking.box_id
  FROM booking, box_booking
  WHERE booking.id = box_booking.booking_id
) AS booking
ON DATE(booking.start) = :day
  AND TIME(booking.end) + INTERVAL DATEDIFF(booking.end, booking.start) DAY > box_slot.start
  AND TIME(booking.start) < box_slot.start + INTERVAL box_slot.duration MINUTE
  AND booking.box_id = box_slot.box_id
  AND booking.deleted_at IS NULL
WHERE venue_schedule.venue_id = :venueId
  AND venue_schedule.schedule_id = ACTIVE_SCHEDULE(:venueId, :day)
  AND box_slot.duration = :duration
  AND booking.id IS NULL
GROUP BY box_slot.start, box_slot.duration, box.id, box_slot.id, type, box_slot_link.id, price.price;