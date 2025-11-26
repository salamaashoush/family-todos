-- Seed default admin user (password: admin123)
-- Hash generated with argon2id: Bun.password.hash("admin123", {algorithm: "argon2id", memoryCost: 65536, timeCost: 3})
INSERT INTO "admin_users" ("username", "password_hash")
VALUES ('admin', '$argon2id$v=19$m=65536,t=3,p=1$ZPkP0yIhPB5BiF4nfwC2q5Qv9RA0UO3Sl4H2JXtazow$xnWMeaSWiVp9ecWj/yhSdXqyytSWw5XzJ/3hTQ6g0GY')
ON CONFLICT ("username") DO NOTHING;

-- Seed default family
INSERT INTO "families" ("id", "name", "slug", "is_onboarded")
VALUES (1, 'My Family', 'my-family', true)
ON CONFLICT DO NOTHING;

-- Link admin to family (get admin id dynamically)
INSERT INTO "user_families" ("user_id", "family_id", "role")
SELECT id, 1, 'owner' FROM "admin_users" WHERE "username" = 'admin'
ON CONFLICT DO NOTHING;

-- Seed global achievements
INSERT INTO "achievements" ("name", "description", "icon", "requirement_type", "requirement_value", "star_reward", "is_global") VALUES
('First Steps', 'Complete your first task', '🌟', 'tasks_completed', 1, 5, true),
('Getting Started', 'Complete 10 tasks', '⭐', 'tasks_completed', 10, 10, true),
('Task Master', 'Complete 50 tasks', '🏆', 'tasks_completed', 50, 25, true),
('Super Star', 'Complete 100 tasks', '💫', 'tasks_completed', 100, 50, true),
('Streak Starter', 'Get a 3-day streak', '🔥', 'streak', 3, 10, true),
('Week Warrior', 'Get a 7-day streak', '🔥', 'streak', 7, 25, true),
('Streak Champion', 'Get a 30-day streak', '🔥', 'streak', 30, 100, true)
ON CONFLICT DO NOTHING;
