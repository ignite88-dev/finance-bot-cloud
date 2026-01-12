import axios from 'axios';
import { ENV } from '../config/environment.js';

async function healthCheck() {
    const url = `http://localhost:${ENV.PORT || 3000}/health`;
    console.log(`Checking health at ${url}...`);

    try {
        const response = await axios.get(url);
        if (response.status === 200 && response.data.status === 'healthy') {
            console.log('✅ Health check PASSED');
            console.log(response.data);
            process.exit(0);
        } else {
            console.error('❌ Health check FAILED');
            console.error('Status:', response.status);
            console.error('Data:', response.data);
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Health check FAILED');
        console.error(error.message);
        process.exit(1);
    }
}

healthCheck();
