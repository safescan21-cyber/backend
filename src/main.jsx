// main.jsx or index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';  // Note: no .jsx extension needed
import './index.css';
import { Provider } from 'react-redux';  // Note: capital 'P'
import { store } from '../src/components/store/store';  // Adjust the p
import ScrollToTop  from "../src/components/pages/Scrolltotop"
import { GoogleOAuthProvider } from '@react-oauth/google';
 // Adjust the path as needed

ReactDOM.createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <GoogleOAuthProvider clientId="195900241083-482lmu8fc32bptqgflnuk54go1dve8ch.apps.googleusercontent.com">
      <BrowserRouter>
        <ScrollToTop />
       
          <App />
        
      </BrowserRouter>
    </GoogleOAuthProvider>
  </Provider>
);