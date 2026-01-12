import { customAlphabet } from 'nanoid';

const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

export function generateId(prefix = '', length = 16) {
    const nanoid = customAlphabet(alphabet, length);
    const id = nanoid();
    return prefix ? `${prefix}_${id}` : id;
}

export function generateConfirmationId() {
    return generateId('confirm', 10);
}

export function generateThreadId() {
    return generateId('thread', 20);
}
