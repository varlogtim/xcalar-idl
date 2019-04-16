export function convertToBase64(logs: string): string {
    return Buffer.from(logs).toString('base64');
}
