import React from 'react';
import { GoogleOAuthProvider, GoogleLogin, CredentialResponse } from '@react-oauth/google';

interface GoogleAuthProps {
  onSuccess: (response: CredentialResponse) => void;
}

const GoogleAuth: React.FC<GoogleAuthProps> = ({ onSuccess }) => {
  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_OAUTH_CLIENT_ID as string}>
      <GoogleLogin
        onSuccess={onSuccess}
        onError={() => {
          console.log('Login Failed');
        }}
        width={228}
        theme="outline"
      />
    </GoogleOAuthProvider>
  );
};

export default GoogleAuth;
