import 'next-auth';
import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      _id?: string;
      username?: string;
      bio?: string;
      privacy?: 'private' | 'public'; 
    } & DefaultSession['user'];
  }

  interface User {
    _id?: string;
    username?: string;
    bio?: string;
    privacy?: 'private' | 'public';
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    _id?: string;
    username?: string;
    bio?: string;
    privacy?: 'private' | 'public'; 
  }
}
