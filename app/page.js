"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

const Home = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message);
      }
      router.push("/login");
      router.refresh();
    } catch (error) {
      throw new Error("Something went wrong!");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center">
      <button
        onClick={handleLogout}
        disabled={isLoading}
        type="button"
        className="absolute top-10 right-20 w-1/7 bg-[#e0e5ec] border-none rounded-[15px] p-4 text-[#3d4468] shadow-[6px_6px_15px_#bec3cf,-6px_-6px_15px_#ffffff] active:shadow-[inset_6px_6px_12px_#bec3cf,inset_-6px_-6px_12px_#ffffff] cursor-pointer transition-all duration-200 tracking-widest font-extrabold text-sm sm:text-lg md:text-xl">
        Logout
      </button>
      <div className="text-center">
        <h1 className="text-xl sm:text-2xl md:text-6xl  font-extrabold">
          Welcome To{" "}
          <span className="text-orange-400 tracking-widest">Neura</span>
        </h1>
        <p className="text-lg sm:text-xl md:text-2xl font-extralight opacity-50 mt-1 sm:mt-2 text-amber-300">
          A modern messaging application
        </p>
      </div>
    </div>
  );
};

export default Home;
