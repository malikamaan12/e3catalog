import Database from 'better-sqlite3';

const db = new Database('./data/rental.db');

const initialSettings = [
    { id: 'term-1', type: 'term_condition', label: 'Weather Clause', content: 'Client is responsible for any damage due to extreme weather.', is_default: 1, is_active: 1, created_at: new Date().toISOString() },
    { id: 'term-2', type: 'term_condition', label: 'Power Req', content: 'Power source must be provided within 50 meters of setup site.', is_default: 1, is_active: 1, created_at: new Date().toISOString() },
    { id: 'term-3', type: 'term_condition', label: 'Cancellation', content: 'Cancellations within 48 hours forfeit the deposit.', is_default: 1, is_active: 1, created_at: new Date().toISOString() },
    { id: 'payterm-1', type: 'payment_term', label: 'Full Advance', content: '100% Payment required in advance to confirm the booking.', is_default: 0, is_active: 1, created_at: new Date().toISOString() },
    { id: 'payterm-2', type: 'payment_term', label: '50% Advance', content: '50% advance payment required to lock booking. 50% due on delivery.', is_default: 1, is_active: 1, created_at: new Date().toISOString() },
    { id: 'paymethod-1', type: 'payment_method', label: 'Bank Transfer (QNB)', content: 'Please transfer to QNB Account: 1234-5678-90. SWIFT: QNBAQAAA', is_default: 1, is_active: 1, created_at: new Date().toISOString() },
    { id: 'paymethod-2', type: 'payment_method', label: 'Credit Card Link', content: 'A secure payment link will be sent to your email upon approval.', is_default: 0, is_active: 1, created_at: new Date().toISOString() },
];

const insert = db.prepare(`
    INSERT OR IGNORE INTO admin_settings (id, type, label, content, is_default, is_active, created_at) 
    VALUES (@id, @type, @label, @content, @is_default, @is_active, @created_at)
`);

const insertMany = db.transaction((settings) => {
    for (const setting of settings) {
        insert.run(setting);
    }
});

try {
    insertMany(initialSettings);
    console.log('Seeded billing settings successfully.');
} catch (error) {
    console.error('Failed to seed settings:', error);
}

db.close();
