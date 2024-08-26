// Main Landing Page
"use client"
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function Home() {
  const [gameId, setGameId] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (gameId) {
      router.push(`/game/${gameId}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-900 to-purple-900 text-white p-8">
      <motion.h1
        className="text-6xl mb-12 font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-pink-500"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        Epic Chess Battle in a Parallled Universe
      </motion.h1>
      <motion.form
        onSubmit={handleSubmit}
        className="flex flex-col items-center"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.2 }}
      >
        <motion.input
          type="text"
          value={gameId}
          onChange={(e) => setGameId(e.target.value)}
          placeholder="Enter game ID"
          className="mb-6 p-4 text-black text-xl rounded-full w-64 focus:outline-none focus:ring-4 focus:ring-yellow-400"
          whileFocus={{ scale: 1.05 }}
        />
        <motion.button
          type="submit"
          className="bg-gradient-to-r from-yellow-400 to-pink-500 text-black font-bold py-3 px-8 rounded-full text-xl"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          Join Game
        </motion.button>
      </motion.form>
      <motion.div
        className="mt-12 text-center"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.4 }}
      >
        <p className="text-2xl mb-4">Ready for an epic twinkled, winkled chess match?</p>
        <p className="text-xl">Enter a game ID to join or create a new game!</p>
      </motion.div>
    </div>
  );
}