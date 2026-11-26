export function normalizePhoneDigits(value) {
    return (value || '').replace(/\D/g, '');
}
export function formatDateBR(value) {
    if (!value)
        return '—';
    const datePart = String(value).split(' ')[0].split('T')[0];
    const [y, m, d] = datePart.split('-');
    if (!y || !m || !d)
        return value;
    return d + '/' + m + '/' + y;
}
