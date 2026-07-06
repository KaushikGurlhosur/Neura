// "use client";
// import ChatArea from "@/components/dashboard/ChatArea";
// import Sidebar from "@/components/dashboard/Sidebar";
// import { ChatProvider } from "@/context/ChatContext";

// import { useRouter } from "next/navigation";
// import { useState } from "react";

// const Home = () => {
//   const router = useRouter();

//   const [isLoading, setIsLoading] = useState(false);

//   const handleLogout = async (e) => {
//     e.preventDefault();
//     setIsLoading(true);
//     try {
//       const res = await fetch("/api/auth/logout", {
//         method: "POST",
//       });
//       if (!res.ok) {
//         const data = await res.json();
//         throw new Error(data.message);
//       }
//       router.push("/login");
//       router.refresh();
//     } catch (error) {
//       throw new Error("Something went wrong!");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <ChatProvider>
//       <div className="flex h-screen w-screen bg-[#e0e5ec] overflow-hidden p-3 font-sans antialiased gap-4 select-none">
//         <Sidebar />
//         <ChatArea />
//       </div>
//     </ChatProvider>
//   );
// };

// export default Home;

"use client";

import ChatArea from "@/components/dashboard/ChatArea";
import Sidebar from "@/components/dashboard/Sidebar";
import { ChatProvider } from "@/context/ChatContext";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import gsap from "gsap"; // 🟢 ADDED: GSAP for premium initial load animations

const Home = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef(null);

  // ─── 🟢 GSAP INITIAL ENTRANCE ANIMATION ──────────────────────────────────
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Create a cinematic scale and fade-in effect for the entire app layout
      gsap.fromTo(
        ".dashboard-element",
        { opacity: 0, y: 40, scale: 0.95 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.8,
          stagger: 0.15, // Sidebar slides in first, then ChatArea
          ease: "power3.out",
          delay: 0.1,
        },
      );
    }, containerRef);

    return () => ctx.revert(); // Cleanup GSAP on unmount
  }, []);

  const handleLogout = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).message);
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
      {/* 🟢 MOBILE-FIRST LAYOUT: Padding is smaller on mobile (p-2), larger on desktop (md:p-4) */}
      <div
        ref={containerRef}
        className="flex h-screen w-screen bg-[#1a1a1a] overflow-hidden p-2 md:p-4 font-sans antialiased gap-2 md:gap-4 select-none">
        <Sidebar />
        <ChatArea />
      </div>
    </ChatProvider>
  );
};

export default Home;
