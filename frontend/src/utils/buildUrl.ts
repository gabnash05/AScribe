const REGION = import.meta.env.VITE_AWS_REGION;
const API_ID = import.meta.env.VITE_API_ID;
const STAGE = import.meta.env.VITE_STAGE;

export function buildUrl(path: string) {
    return `https://${API_ID}.execute-api.${REGION}.amazonaws.com/${STAGE}/${path}`;
}