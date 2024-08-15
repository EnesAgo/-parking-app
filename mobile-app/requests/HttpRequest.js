
import axios from 'axios';



const instance = axios.create({
    // baseURL: 'http://localhost:3001',
    // baseURL: 'http://192.168.149.204:3001',
    baseURL: 'http://192.168.100.90:3001',
    timeout: 10000,
});

// Add a request interceptor
instance.interceptors.request.use(async function (config) {

    try {
        const jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3RydWUiOiJ5ZXMifQ.WQ3h-9lORqWjy2KaaIWsV8GHSQpsi1L-EOPvWjTnhe0"

        config.headers.common = { Authorization: `Bearer ${jwt}` };

    } catch (e) {
        console.log(`error: ${e}`)
    }

    return config;
}, function (error) {
    return Promise.reject(error);
});


// Add a response interceptor
instance.interceptors.response.use(function (response) {
    // Any status code that lie within the range of 2xx cause this function to trigger
    // Do something with response data
    return response.data;
}, function (error) {
    // Any status codes that falls outside the range of 2xx cause this function to trigger
    // Do something with response error
    return Promise.reject(error);
});
export default instance