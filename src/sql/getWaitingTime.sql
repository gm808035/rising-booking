SELECT
  superfiltered.slot_duration,
  superfiltered.box_section,
  superfiltered.selected_date,
  superfiltered.booking_start,
  superfiltered.booking_end,
  superfiltered.box_ids,
  superfiltered.previous_booking,
  superfiltered.wait_time,
  CAST(FLOOR(price.price * (:duration/ 60)) AS UNSIGNED) AS price,
  price.start as price_start,
  price.type as price_type
FROM (
  SELECT :duration AS slot_duration,
    box_section,
    open_time_id,
    selected_date,
    booking_start,
    booking_end,
    box_ids,
    previous_booking,
    IF(
      booking_start != "0"
      AND (
      	previous_booking
        OR NOT ENOUGH_TIME_BEFORE(selected_date, booking_start, :duration, :cleanup, box_section)
      ),
      TIMESTAMPDIFF(MINUTE, :date, booking_end) + SECTION_OVERTIME(box_section, TIMESTAMPADD(MINUTE, :cleanup, booking_end)),
      TIMESTAMPDIFF(MINUTE, :date, selected_date) + SECTION_OVERTIME(box_section, TIMESTAMPADD(MINUTE, :cleanup, selected_date))
    ) + :cleanup as wait_time
  FROM (
    SELECT
  	  box.box_section_id as box_section,
  	  GROUP_CONCAT(box.id) as box_ids,
  	  COUNT(previous_booking.id) as previous_booking,
  	  ANY_VALUE(open_time.start) as open_time_start,
  	  ANY_VALUE(open_time.id) as open_time_id,
  	  ANY_VALUE(venue.id) as venue_id,
      -- get greatest between selected date and open_time.start
      GREATEST(:date, TIMESTAMP(DATE(:date), (SELECT open_time_start))) as selected_date,
      -- return minimum booking.start WHEN
      -- - previous_booking is NULL
      -- - booking is NOT NULL
      -- - there is time between selected_date and booking.start
      -- ELSE return 0 (can be booked at selected_date)
      MIN(IF(
        previous_booking.id IS NULL
        AND booking.start IS NOT NULL
        AND ENOUGH_TIME_BEFORE(GREATEST(:date, TIMESTAMP(DATE(:date), ANY_VALUE(open_time.start))), booking.start, :duration, :cleanup, box.box_section_id),
        0,
        IFNULL(booking.start, 0)
      )) as booking_start,
      MIN(IF(
        previous_booking.id IS NULL
        AND booking.start IS NOT NULL
        AND ENOUGH_TIME_BEFORE(GREATEST(:date, TIMESTAMP(DATE(:date), ANY_VALUE(open_time.start))), booking.start, :duration, :cleanup, box.box_section_id),
        0,
        IFNULL(booking.end, 0)
		  )) as booking_end
    FROM venue
    INNER JOIN venue_schedule 
	ON venue.id = venue_schedule.venue_id
	INNER JOIN schedule
	ON venue_schedule.schedule_id = schedule.id
  	  AND schedule.id = ACTIVE_SCHEDULE(:venueId, :date)
    INNER JOIN open_time
ON schedule.id = open_time.schedule_id
    INNER JOIN box
    ON venue.id = box.venue_id
    LEFT JOIN (
      SELECT
        booking.*, box_booking.box_id
      FROM booking
      INNER JOIN box_booking
      ON booking.id = box_booking.booking_id
    ) AS booking
    ON DATE(booking.start) = DATE(:date)
      AND TIME(booking.end) >= TIME(:date)
      AND booking.box_id = box.id
      AND booking.deleted_at IS NULL
    LEFT JOIN (
      SELECT
        booking.*, box_booking.box_id
      FROM booking
      INNER JOIN box_booking
      ON booking.id = box_booking.booking_id
    ) AS next_booking
    ON next_booking.id = (
      SELECT id FROM (select b.id, b.start, bb.id as box_booking_id, b.deleted_at, bb.box_id from booking b inner join box_booking bb on b.id = bb.booking_id) AS b WHERE booking.box_id = b.box_id
      AND DATE(b.start) = DATE(booking.start)
    	AND TIME(b.start) > TIME(booking.start)
    	AND booking.id != b.id
    	AND b.deleted_at IS NULL
    ORDER BY b.start
    LIMIT 1)
    LEFT JOIN (
      SELECT
        booking.*, box_booking.box_id
      FROM booking
      INNER JOIN box_booking
      ON booking.id = box_booking.booking_id
    ) AS previous_booking
    ON previous_booking.id = (
    	SELECT id FROM (select b.id, b.start, b.end, bb.id as box_booking_id, b.deleted_at, bb.box_id from booking b inner join box_booking bb on b.id = bb.booking_id) AS b WHERE booking.box_id = b.box_id
      AND DATE(b.start) = DATE(booking.start)
      AND TIME(b.start) < TIME(booking.start)
      AND TIME(b.end) > TIME(:date)
      AND booking.id != b.id
      AND b.deleted_at IS NULL
    ORDER BY b.start DESC
    LIMIT 1)
    WHERE venue.id = :venueId
	  -- can be booked until venue closes
	  AND TIMESTAMPDIFF(MINUTE, GREATEST(TIME(:date), open_time.start), open_time.end) >=
	      :duration + :cleanup + SECTION_OVERTIME(box.box_section_id, TIMESTAMP(DATE(:date), GREATEST(TIME(:date), open_time.start)))
	  AND (
	    -- there is time before booking starts and FROM either open time or :date, whichever is highest
	    -- no previous booking FROM :date to this booking
	  	(
	    	previous_booking.id IS NULL
	    	AND TIMESTAMPDIFF(MINUTE, GREATEST(TIME(:date), open_time.start), TIME(booking.start)) >=
	    	  :duration + :cleanup + SECTION_OVERTIME(box.box_section_id, TIMESTAMP(DATE(:date), GREATEST(TIME(:date), open_time.start)))
	    )
	    -- last bookings of the day and time until close time of venue
	    OR (
	    	next_booking.id IS NULL
	    	AND TIMESTAMPDIFF(MINUTE, TIME(booking.end), open_time.end) >=
	    	  :duration + :cleanup + SECTION_OVERTIME(box.box_section_id, booking.end)
	    )
	    -- check there is time between this booking and next booking
	    OR (
	    	next_booking.id IS NOT NULL
	    	AND TIMESTAMPDIFF(MINUTE, booking.end, next_booking.start) >=
	    	  :duration + :cleanup + SECTION_OVERTIME(box.box_section_id, booking.end)
	    )
	    -- box available, no bookings
	    OR (
	    	booking.id IS NULL
	    )
	  )
    GROUP BY box.box_section_id
  ) as filtered_bookings
WHERE venue_id = :venueId
ORDER BY wait_time LIMIT 1) as superfiltered
INNER JOIN price on price.open_time_id = superfiltered.open_time_id
WHERE TIMESTAMPADD(MINUTE, superfiltered.wait_time - :cleanup, TIME(:date)) >= price.start
AND TIMESTAMPADD(MINUTE, superfiltered.wait_time - :cleanup, TIME(:date)) <= price.end
LIMIT 1