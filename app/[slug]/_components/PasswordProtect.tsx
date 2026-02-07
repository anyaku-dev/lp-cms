'use client';
import { useState } from 'react';

export default function PasswordProtect({ validPassword, children }: { validPassword: string, children: React.ReactNode }) {
  const [input, setInput] = useState('');
  const [unlocked, setUnlocked] = useState(false);

  const check = () => {
    if (input === validPassword) setUnlocked(true);
    else alert('パスワードが違います');
  };

  if (unlocked) return <>{children}</>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded shadow-lg max-w-sm w-full text-center">
        <h2 className="text-xl font-bold mb-4">Password Protected</h2>
        <input 
          type="password" 
          className="border p-2 w-full mb-4 rounded" 
          placeholder="Enter Password" 
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <button onClick={check} className="bg-blue-600 text-white w-full py-2 rounded font-bold">Access</button>
      </div>
    </div>
  );
}