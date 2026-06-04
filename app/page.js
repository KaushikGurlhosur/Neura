"use client";
import ChatArea from "@/components/dashboard/ChatArea";
import Sidebar from "@/components/dashboard/Sidebar";
import { ChatProvider } from "@/context/ChatContext";

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
    <ChatProvider>
      <div className="flex h-screen w-screen bg-[#e0e5ec] overflow-hidden p-3 font-sans antialiased gap-4 select-none">
        <Sidebar />
        <ChatArea />
      </div>
    </ChatProvider>
  );
};

export default Home;
