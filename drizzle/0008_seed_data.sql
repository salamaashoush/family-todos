-- Seed default admin user (password: admin123)
-- Hash generated with argon2id: Bun.password.hash("admin123", {algorithm: "argon2id", memoryCost: 65536, timeCost: 3})
-- IMPORTANT: Change the default password immediately after deployment!
INSERT INTO "admin_users" ("username", "password_hash", "is_super_admin", "is_default_admin", "account_status")
VALUES ('admin', '$argon2id$v=19$m=65536,t=3,p=1$ZPkP0yIhPB5BiF4nfwC2q5Qv9RA0UO3Sl4H2JXtazow$xnWMeaSWiVp9ecWj/yhSdXqyytSWw5XzJ/3hTQ6g0GY', true, true, 'active')
ON CONFLICT ("username") DO NOTHING;

-- Seed default family (with a fixed share_token for reproducibility)
INSERT INTO "families" ("id", "name", "slug", "share_token", "is_onboarded")
VALUES (1, 'My Family', 'my-family', 'defaultShareToken1234567890abcdef', true)
ON CONFLICT DO NOTHING;

-- Link admin to family (get admin id dynamically)
INSERT INTO "user_families" ("user_id", "family_id", "role")
SELECT id, 1, 'owner' FROM "admin_users" WHERE "username" = 'admin'
ON CONFLICT DO NOTHING;

-- Seed family members
INSERT INTO "members" ("id", "family_id", "name", "avatar", "is_parent") VALUES
(1, 1, 'Batman', NULL, true),
(2, 1, 'Superman', NULL, false)
ON CONFLICT DO NOTHING;

-- Seed member stats for each member
INSERT INTO "member_stats" ("member_id", "total_stars", "current_streak", "longest_streak", "total_tasks_completed", "total_timeslots_completed", "level") VALUES
(1, 0, 0, 0, 0, 0, 1),
(2, 0, 0, 0, 0, 0, 1)
ON CONFLICT DO NOTHING;

-- Seed timeslots (common family routines)
-- recurrence_days uses numeric day values: 0=Sunday, 1=Monday, ..., 6=Saturday (matches Date.getDay())
INSERT INTO "timeslots" ("id", "family_id", "name", "description", "start_time", "end_time", "recurrence_type", "recurrence_days", "is_active") VALUES
(1, 1, 'Morning Routine', 'Start the day right', '07:00', '08:00', 'daily', '0,1,2,3,4,5,6', true),
(2, 1, 'After School', 'Homework and activities', '15:00', '17:00', 'weekly', '1,2,3,4,5', true),
(3, 1, 'Evening Routine', 'Wind down for bed', '19:00', '20:30', 'daily', '0,1,2,3,4,5,6', true),
(4, 1, 'Weekend Chores', 'Help around the house', '10:00', '12:00', 'weekly', '0,6', true)
ON CONFLICT DO NOTHING;

-- Assign members to timeslots (both members get all timeslots)
INSERT INTO "timeslot_members" ("timeslot_id", "member_id") VALUES
(1, 1), (1, 2),
(2, 1), (2, 2),
(3, 1), (3, 2),
(4, 1), (4, 2)
ON CONFLICT DO NOTHING;

-- Seed todos (common family tasks)
INSERT INTO "todos" ("id", "family_id", "title", "description", "symbol", "position", "points") VALUES
-- Morning routine tasks
(1, 1, 'Make Bed', 'Straighten sheets and arrange pillows', NULL, 0, 5),
(2, 1, 'Brush Teeth', 'Brush for 2 minutes', NULL, 1, 5),
(3, 1, 'Get Dressed', 'Put on clean clothes for the day', NULL, 2, 5),
(4, 1, 'Eat Breakfast', 'Have a healthy breakfast', NULL, 3, 5),
(5, 1, 'Pack Bag', 'Make sure everything is ready', NULL, 4, 5),
-- After school tasks
(6, 1, 'Do Homework', 'Complete all assignments', NULL, 5, 10),
(7, 1, 'Read for 20 mins', 'Read a book or educational material', NULL, 6, 10),
(8, 1, 'Practice Instrument', 'Practice music for at least 15 minutes', NULL, 7, 10),
-- Evening routine tasks
(9, 1, 'Shower/Bath', 'Get clean before bed', NULL, 8, 5),
(10, 1, 'Brush Teeth (Night)', 'Brush and floss before bed', NULL, 9, 5),
(11, 1, 'Prepare Clothes', 'Lay out clothes for tomorrow', NULL, 10, 5),
(12, 1, 'Story Time', 'Read or listen to a story', NULL, 11, 5),
-- Weekend chores
(13, 1, 'Clean Room', 'Tidy up and organize your room', NULL, 12, 15),
(14, 1, 'Help with Laundry', 'Sort, fold, or put away clothes', NULL, 13, 10),
(15, 1, 'Set/Clear Table', 'Help with meal setup or cleanup', NULL, 14, 5),
(16, 1, 'Take Out Trash', 'Empty trash bins', NULL, 15, 5),
(17, 1, 'Water Plants', 'Water indoor and outdoor plants', NULL, 16, 5),
(18, 1, 'Feed Pets', 'Feed and water any pets', NULL, 17, 5)
ON CONFLICT DO NOTHING;

-- Assign todos to timeslots
INSERT INTO "todo_timeslots" ("todo_id", "timeslot_id") VALUES
-- Morning routine tasks -> Morning Routine timeslot
(1, 1), (2, 1), (3, 1), (4, 1), (5, 1),
-- After school tasks -> After School timeslot
(6, 2), (7, 2), (8, 2),
-- Evening routine tasks -> Evening Routine timeslot
(9, 3), (10, 3), (11, 3), (12, 3),
-- Weekend chores -> Weekend Chores timeslot
(13, 4), (14, 4), (15, 4), (16, 4), (17, 4), (18, 4)
ON CONFLICT DO NOTHING;

-- Seed global achievements (expanded)
INSERT INTO "achievements" ("name", "description", "icon", "requirement_type", "requirement_value", "star_reward", "is_global") VALUES
-- Task completion achievements
('First Steps', 'Complete your first task', '1st', 'tasks_completed', 1, 5, true),
('Getting Started', 'Complete 10 tasks', 'x10', 'tasks_completed', 10, 10, true),
('On a Roll', 'Complete 25 tasks', 'x25', 'tasks_completed', 25, 15, true),
('Task Master', 'Complete 50 tasks', 'x50', 'tasks_completed', 50, 25, true),
('Century Club', 'Complete 100 tasks', 'x100', 'tasks_completed', 100, 50, true),
('Task Legend', 'Complete 250 tasks', 'x250', 'tasks_completed', 250, 100, true),
('Task Champion', 'Complete 500 tasks', 'x500', 'tasks_completed', 500, 200, true),
-- Streak achievements
('Streak Starter', 'Get a 3-day streak', '3d', 'streak', 3, 10, true),
('Week Warrior', 'Get a 7-day streak', '7d', 'streak', 7, 25, true),
('Two Week Titan', 'Get a 14-day streak', '14d', 'streak', 14, 50, true),
('Monthly Master', 'Get a 30-day streak', '30d', 'streak', 30, 100, true),
('Consistency King', 'Get a 60-day streak', '60d', 'streak', 60, 200, true),
('Streak Legend', 'Get a 100-day streak', '100d', 'streak', 100, 500, true),
-- Level achievements
('Level Up', 'Reach level 5', 'L5', 'level', 5, 25, true),
('Rising Star', 'Reach level 10', 'L10', 'level', 10, 50, true),
('High Achiever', 'Reach level 25', 'L25', 'level', 25, 100, true),
('Elite Status', 'Reach level 50', 'L50', 'level', 50, 250, true),
('Master Level', 'Reach level 100', 'L100', 'level', 100, 500, true),
-- Timeslot completion achievements
('Routine Rookie', 'Complete 10 timeslots', 'T10', 'timeslots_completed', 10, 10, true),
('Routine Regular', 'Complete 50 timeslots', 'T50', 'timeslots_completed', 50, 25, true),
('Routine Pro', 'Complete 100 timeslots', 'T100', 'timeslots_completed', 100, 50, true),
('Routine Master', 'Complete 250 timeslots', 'T250', 'timeslots_completed', 250, 100, true),
-- Star collection achievements
('Star Collector', 'Earn 100 stars', 'S100', 'stars', 100, 20, true),
('Star Hoarder', 'Earn 500 stars', 'S500', 'stars', 500, 50, true),
('Star Rich', 'Earn 1000 stars', 'S1k', 'stars', 1000, 100, true),
('Star Millionaire', 'Earn 5000 stars', 'S5k', 'stars', 5000, 250, true)
ON CONFLICT DO NOTHING;

-- Reset sequences to avoid conflicts with manual IDs
SELECT setval('members_id_seq', (SELECT COALESCE(MAX(id), 0) FROM members) + 1, false);
SELECT setval('timeslots_id_seq', (SELECT COALESCE(MAX(id), 0) FROM timeslots) + 1, false);
SELECT setval('todos_id_seq', (SELECT COALESCE(MAX(id), 0) FROM todos) + 1, false);
