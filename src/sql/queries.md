# Queries

## Get Availability By Date Range Query

### Parameters needed

- **_venueCode_**
- **_startDate_**
- **_endDate_**
- **_duration_**

### Logic

1. Get **venue-schedule** by **_venueCode_** and by schedule id that is applied for each day that has **bookings**

1. Join with all **boxes** associated to the **venue-schedule** by venue id

1. Join with all **bookings**, including the **box_id** selected from **box_booking** table, and associated to the **venue-schedule** by venue\*id AND between **_startDate_** and **_endDate_** AND not deleted

1. For each day that has bookings, check if there are no **box_slots** available matched against schedule_id,associated to **boxes**, **bookings** times and with duration. If there are no **box_slots** then the day is fully booked and should be returned

   - To check if there are no **box_slots** the following logic is applied:

     1. Match all current **bookings** for each day against the available **box_slots**

     1. Then merge against all **box_slots** of each day for required schedule_id

     1. Then return the dates that have the same or greater number of **box_slots** used with **box_slots** available (which mean there are no **box_slots** available on that day and it is fully booked)

Note: Will return only dates that are fully booked so that the lambda will have to return all other dates between the date range provided

### Performance

| id  | select_type | table          | partitions | type   | possible_keys                                                               | key                                        | key_len | ref                                 | rows | filtered | Extra                                        |
| --- | ----------- | -------------- | ---------- | ------ | --------------------------------------------------------------------------- | ------------------------------------------ | ------- | ----------------------------------- | ---- | -------- | -------------------------------------------- |
| 1   | PRIMARY     | booking        | NULL       | index  | PRIMARY, booking_start_end_deleted_at                                       | booking_start_end_deleted_at               | 18      | NULL                                | 931  | 10.00    | Using where; Using index; Using filesort     |
| 1   | PRIMARY     | venue_schedule | NULL       | ref    | venue_id, schedule_id                                                       | schedule_id                                | 5       | func                                | 1    | 18.18    | Using where                                  |
| 1   | PRIMARY     | box_booking    | NULL       | ref    | booking_id, box_id                                                          | booking_id                                 | 5       | database.booking.id                 | 1    | 100.00   | Using where                                  |
| 1   | PRIMARY     | box            | NULL       | eq_ref | PRIMARY,venue_id                                                            | PRIMARY                                    | 4       | database.box_booking.box_id         | 1    | 12.82    | Using where                                  |
| 1   | PRIMARY     | box_slot       | NULL       | ref    | box_slot_schedule_id_foreign_idx,box_slot_box_id_duration_start_schedule_id | box_slot_box_id_duration_start_schedule_id | 10      | database.box_booking.box_id,const   | 28   | 0.93     | Using where; Using Index                     |
| 1   | PRIMARY     | box            | NULL       | eq_ref | PRIMARY,venue_id                                                            | PRIMARY                                    | 4       | database.slots.box_id               | 1    | 100.00   | Using where                                  |
| 1   | PRIMARY     | slots          | NULL       | ref    | box_slot_schedule_id_foreign_idx,box_slot_box_id_duration_start_schedule_id | box_slot_schedule_id_foreign_idx           | 5       | database.venue_schedule.schedule_id | 45   | 100.00   | Using where                                  |
| 3   | SUBQUERY    | venue_schedule | NULL       | ref    | venue_id,schedule_id                                                        | venue_id                                   | 5       | const                               | 6    | 100      | Using where; Using temporary; Using filesort |
| 3   | SUBQUERY    | schedule       | NULL       | eq_ref | PRIMARY                                                                     | PRIMARY                                    | 4       | database.venue_schedule.schedule_id | 1    | 100      | Using where                                  |

## Get Availability By Day Query

### Parameters needed:

- **_venueCode_**
- **_day_**
- **_duration_**

### Logic

1. Get **venue-schedule** by **_venueCode_** and by schedule id that is applied for **_day_**

1. Join with **open_times** associated to the **venue-schedule** by schedule id and for the same applied day as **_day_**

1. Join with **price** associated to the **open_times**

1. Join with all **boxes** associated to the **venue-shcedule** by venue_id

1. Join with all **box_slots** associated to **boxes**, **venue-schedule** by schedule_id

1. Join with all **box_slot_links** associated to the venue AND for the matching **box_slot_id**

1. Join with all **bookings**, including the **box_id** selected from **box_booking** table, and that overlap any **box_slot** time AND for a **_day_** AND not deleted

1. Filter by **_duration_**

1. Return all **box_slots** that do not match a booking

1. For each **box_slot**, use the **price** table to retrieve the correct price point for the time the box slot is available and calculate the price accordingly depending on the box slot **_duration_**.

### Performance

| id  | select_type | table          | partitions | type   | possible_keys                                                               | key                              | key_len | ref                                 | rows | filtered | Extra                                        |
| --- | ----------- | -------------- | ---------- | ------ | --------------------------------------------------------------------------- | -------------------------------- | ------- | ----------------------------------- | ---- | -------- | -------------------------------------------- |
| 1   | PRIMARY     | open_time      | NULL       | const  | PRIMARY,open_time_schedule_id                                               | open_time_schedule_id            | 5       | const                               | 1    | 100.00   | Using index; Using temporary; Using filesort |
| 1   | PRIMARY     | venue_schedule | NULL       | ref    | venue_id,schedule_id                                                        | schedule_id                      | 5       | const                               | 1    | 18.18    | Using where                                  |
| 1   | PRIMARY     | box_slot       | NULL       | ref    | box_slot_schedule_id_foreign_idx,box_slot_box_id_duration_start_schedule_id | box_slot_schedule_id_foreign_idx | 5       | const                               | 5    | 10       | Using where                                  |
| 1   | PRIMARY     | box            | NULL       | eq_ref | PRIMARY,venue_id                                                            | PRIMARY                          | 4       | database.box_slot.box_id            | 1    | 12.82    | Using where                                  |
| 1   | PRIMARY     | price          | NULL       | ref    | price_open_time_id_foreign_idx                                              | price_open_time_id_foreign_idx   | 5       | const                               | 2    | 11.11    | Using where                                  |
| 1   | PRIMARY     | box_slot_link  | NULL       | ref    | box_slot_id                                                                 | box_slot_id                      | 5       | database.box_slot.id                | 1    | 100      | Using index                                  |
| 1   | PRIMARY     | box_booking    | NULL       | ref    | booking_id,box_id                                                           | box_id                           | 5       | database.box_slot.box_id            | 51   | 100      | NULL                                         |
| 1   | PRIMARY     | booking        | NULL       | eq_ref | PRIMARY                                                                     | PRIMARY                          | 4       | database.box_booking.booking_id     | 1    | 100.00   | Using where                                  |
| 3   | SUBQUERY    | venue_schedule | NULL       | ref    | venue_id,schedule_id                                                        | venue_id                         | 5       | const                               | 6    | 100      | Using where; Using temporary; Using filesort |
| 3   | SUBQUERY    | schedule       | NULL       | eq_ref | PRIMARY                                                                     | PRIMARY                          | 4       | database.venue_schedule.schedule_id | 1    | 100      | Using where                                  |

## Get Waiting Time Query

### Parameters needed

- **_venueCode_**
- **_date_**
- **_duration_**
- **_cleanup_**

### Logic

1. Get **venue-schedule** by **_venueCode_** and schedule id that applied for **_date_**

1. Join with **open_times** to the **venue-schedule** by schedule id and for the same applied day as **_date_**

1. Join with all **boxes** associated to the **venue-schedule** by venue id

1. Left join with all **bookings** that are on the same day as **_date_** AND after time of **_date_** AND not deleted. **Boxes** without **bookings** will still be part of this join with **null**

1. Left join all **bookings** from previous join with the **booking** that occurs immediately after this one as **next_booking**

1. Left join all **bookings** from previous join with the **booking** that occurs immediately before this one as **previous_booking**

1. Return only **bookings** that can be booked until venue closes AND any of the below conditions is true

   - There is time before booking starts and from either **open_time** or **_date_**, whichever is highest AND no **previous_booking**

   - Last booking of the day and time until close time of venue

   - There is time between this booking and **next_booking**

   - Box available without bookings

1. From the previous **bookings**, group by **box.section** and return one **booking** per section when:

   - There is no **previous_booking** AND there is a booking AND there is enough time before booking

   - Lowest **booking.start** of all previous **bookings** or 0 if no bookings

1. Calculate for all previous **bookings** the following fields:

   - **wait_time** is calculated with the following rules

     - If there is a **booking.start** AND there is a **previous_booking** OR there is enough time before this **booking** then:
       - Return time difference between **_date_** AND **booking.end**
     - Else there is a **box** available immediately:
       - Return time difference between **_date_** AND **_date_** OR **open_time.start** (whichever is highest)

   - **price** is calculated with the following rules
     - Get the price point for the time the box is available, use the **price** column value
     - Calculate actual price based on **duration** and the **price** column value

1. Order by calculated **wait_time** per booking

### Performance

| id  | select_type        | table                | partitions | type   | possible_keys                  | key                            | key_len | ref                                 | rows | filtered | Extra                                                               |
| --- | ------------------ | -------------------- | ---------- | ------ | ------------------------------ | ------------------------------ | ------- | ----------------------------------- | ---- | -------- | ------------------------------------------------------------------- |
| 1   | PRIMARY            | <derived2>           | NULL       | ALL    | NULL                           | NULL                           | NULL    | NULL                                | 1    | 100.00   | NULL                                                                |
| 1   | PRIMARY            | price                | NULL       | ref    | price_open_time_id_foreign_idx | price_open_time_id_foreign_idx | 5       | superfiltered.open_time_id          | 1    | 11.11    | Using index condition; Using where                                  |
| 1   | DERIVED            | <derived3>           | NULL       | ref    | <auto_key0>                    | <auto_key0>                    | 8       | const                               | 4    | 100.00   | Using temporary; Using filesort                                     |
| 4   | DERIVED            | venue                | NULL       | const  | PRIMARY                        | PRIMARY                        | 4       | const                               | 1    | 100.00   | Using temporary; Using filesort                                     |
| 4   | DERIVED            | schedule             | NULL       | const  | PRIMARY                        | PRIMARY                        | 4       | const                               | 1    | 100.00   | Using index                                                         |
| 4   | DERIVED            | open_time            | NULL       | const  | open_time_scheule_id           | open_time_schedule_id          | 5       | const                               | 1    | 100.00   | NULL                                                                |
| 4   | DERIVED            | box                  | NULL       | ref    | venue_id                       | venue_id                       | 5       | const                               | 5    | 100.00   | Using index condition; Using where                                  |
| 4   | DERIVED            | venue_schedule       | NULL       | ref    | venue_id,schedule_id           | schedule_id                    | 5       | const                               | 1    | 18.18    | Using where                                                         |
| 4   | DERIVED            | box_booking          | NULL       | ref    | booking_id,box_id              | box_id                         | 5       | database.box.id                     | 51   | 100.00   | NULL                                                                |
| 4   | DERIVED            | booking              | NULL       | eq_ref | PRIMARY                        | PRIMARY                        | 5       | database.box_booking.booking_id     | 1    | 100.00   | Using where                                                         |
| 4   | DERIVED            | next_booking         | NULL       | eq_ref | PRIMARY                        | PRIMARY                        | 4       | func                                | 1    | 100.00   | Using where                                                         |
| 4   | DERIVED            | next_box_booking     | NULL       | ref    | booking_id                     | booking_id                     | 5       | database.booking.id                 | 1    | 100.00   | Using index                                                         |
| 4   | DERIVED            | previous_booking     | NULL       | eq_ref | PRIMARY                        | PRIMARY                        | 4       | func                                | 1    | 100.00   | Using where; Using index                                            |
| 4   | DERIVED            | previous_box_booking | NULL       | ref    | booking_id                     | booking_id                     | 5       | database.booking.id                 | 1    | 100.00   | Using index                                                         |
| 11  | DEPENDENT SUBQUERY | bb                   | NULL       | ref    | booking_id,box_id              | box_id                         | 5       | func                                | 51   | 100.00   | Using index condition; Using where; Using temporary; Using filesort |
| 11  | DEPENDENT SUBQUERY | b                    | NULL       | eq_ref | PRIMARY                        | PRIMARY                        | 4       | database.bb.booking_id              | 1    | 100.00   | Using where                                                         |
| 8   | DEPENDENT SUBQUERY | bb                   | NULL       | ref    | booking_id,box_id              | box_id                         | 5       | func                                | 51   | 100.00   | Using index condition; Using where; Using temporary; Using filesort |
| 8   | DEPENDENT SUBQUERY | b                    | NULL       | eq_ref | PRIMARY                        | PRIMARY                        | 4       | database.bb.booking_id              | 1    | 100.00   | Using where                                                         |
| 5   | SUBQUERY           | venue_schedule       | NULL       | ref    | venue_id,schedule_id           | venue_id                       | 5       | const                               | 6    | 100      | Using where; Using temporary; Using filesort                        |
| 5   | SUBQUERY           | schedule             | NULL       | ref    | PRIMARY                        | PRIMARY                        | 4       | database.venue_schedule.schedule_id | 1    | 100      | Using where                                                         |
| 4   | DEPENDENT SUBQUERY | NULL                 | NULL       | NULL   | NULL                           | NULL                           | NULL    | NULL                                | NULL | NULL     | No tables used                                                      |
