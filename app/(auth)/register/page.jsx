"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const UserIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="w-5 h-full">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const EmailIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="w-5 h-full">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const LockIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="w-5 h-full">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
  </svg>
);

const EyeOpenIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="w-5 h-full">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeClosedIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="w-5 h-full">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const CheckIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    className="w-5 h-full">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-[22px] h-[22px]">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const GithubIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-[22px] h-[22px]">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);

const TwitterIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-[22px] h-[22px]">
    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
  </svg>
);

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    username: "",
    password: "",
    confirmPassword: "",
    email: "",
    phoneNumber: "",
    bio: "",
  });
  const [userId, setUserId] = useState("");
  const [otp, setOtp] = useState("");
  const [devOTP, setDevOTP] = useState("");
  const [isloading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState("");
  const [passwordWarning, setPasswordWarning] = useState("");

  // Input structural notification flags
  const [warnings, setWarnings] = useState({
    username: "",
    email: "",
    phoneNumber: "",
  });

  // ─── Real-Time Field Verification Loops
  useEffect(() => {
    if (!form.username) return;
    const delay = setTimeout(() => {
      checkExistingUser("username", form.username);
    }, 400);

    return () => clearTimeout(delay);
  }, [form.username]);

  useEffect(() => {
    if (!form.email) return;
    const delay = setTimeout(() => {
      checkExistingUser("email", form.email);
    });
    return () => clearTimeout(delay); // cleanup function to prevent memory leaks
  }, [form.email]);

  useEffect(() => {
    if (!form.phoneNumber) return;
    const delay = setTimeout(() => {
      checkExistingUser("phoneNumber", form.phoneNumber);
    });
    return () => clearTimeout(delay);
  }, [form.phoneNumber]);

  useEffect(() => {
    if (!form.confirmPassword) {
      setPasswordWarning("");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setPasswordWarning("Password does not match");
    } else {
      setPasswordWarning("");
    }
  }, [form.password, form.confirmPassword]);

  const checkExistingUser = async (field, value) => {
    try {
      const res = await fetch("/api/auth/check-exists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ field, value }),
      });

      const data = await res.json();
      if (data.exists) {
        setWarnings((prev) => ({
          ...prev,
          [field]: `This ${field} already exists.`,
        }));
      } else {
        setWarnings((prev) => ({ ...prev, [field]: "" }));
      }
    } catch (error) {
      console.error("Target lookup validation failed.");
    }
  };

  const hasWarnings =
    warnings.username || warnings.email || warnings.phoneNumber;

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      const { confirmPassword, ...payload } = form;
      // CHANGE: We use a standard fetch to your custom login endpoint
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }

      setUserId(data.userId);
      if (data.devOTP) setDevOTP(data.devOTP);
      console.log(data);

      // Verification email has successfully left the server wrapper; reveal verification card frame
      setShowModal(true);

      // If successful, your backend should have set the "token" cookie
      // So we just redirect to the dashboard/home
      // router.push("/");
      // router.refresh(); // Forces Next.js to re-check the cookies
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Step 2: Handle Verification Input (Saves verification to Database) ───
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, otp }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "OTP verification failed");
      }

      router.push("/");
      router.refresh(); // Forces Next.js to re-check the cookies
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setMessage("Resending...");
    setIsResending(true);
    setError("");

    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to resend OTP");
      }

      if (data.devOTP) {
        setDevOTP(data.devOTP);
      }
      setMessage("Verification code sent to your email address.");
    } catch (error) {
      setError(error.message);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[130dvh] md:min-h-dvh bg-[#e0e5ec] ">
      <div className="bg-[#e0e5ec] rounded-4xl shadow-[20px_20px_60px_#bec3cf,-20px_-20px_60px_#ffffff] w-[320px] sm:w-sm md:w-2xl p-3 md:p-5">
        <div className="flex flex-col justify-center items-center">
          <h2 className="text-[#3d4468] font-extrabold text-xl sm:text-2xl md:text-3xl mb-2.5">
            Create an Account
          </h2>

          <p className="text-[#9499b7] text-center text-sm sm:text-base md:text-lg mb-2">
            Join Neura to access advanced real-time communication lines
          </p>
        </div>

        {error && (
          <div className="text-[#e74c3c] mb-4 text-center font-extralight">
            {error}
          </div>
        )}

        <form
          onSubmit={handleRegister}
          className="p-4 m-2 space-y-2.5 md:space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 md:gap-4 space-y-2.5 md:-space-y-2.5">
            <div>
              <div className="relative ">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[#9499b7]">
                  <UserIcon />
                </div>
                <input
                  className="w-full bg-[#e0e5ec] border-none rounded-[15px] pt-[20px] pr-[24px] p-4 pl-12 shadow-[inset_8px_8px_16px_#bec3cf,inset_-8px_-8px_16px_#ffffff] text-[#3d4468] text-sm sm:text-base md:text-lg outline-none"
                  type="text"
                  placeholder="Full Name"
                  maxLength={30}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <div className="relative ">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[#9499b7]">
                  <UserIcon />
                </div>
                <input
                  className="w-full bg-[#e0e5ec] border-none rounded-[15px] pt-[20px] pr-[24px] p-4 pl-12 shadow-[inset_8px_8px_16px_#bec3cf,inset_-8px_-8px_16px_#ffffff] text-[#3d4468] text-sm sm:text-base md:text-lg outline-none"
                  type="text"
                  placeholder="User Name"
                  value={form.username}
                  maxLength={30}
                  onChange={(e) =>
                    setForm({ ...form, username: e.target.value })
                  }
                  required
                />
              </div>
              {warnings.username && (
                <p className="text-red-500 font-extralight text-xs sm:text-sm pl-2">
                  {warnings.username}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 md:gap-4 space-y-2.5 md:-space-y-2.5">
            <div>
              <div className="relative ">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[#9499b7]">
                  <EmailIcon />
                </div>
                <input
                  className="w-full bg-[#e0e5ec] border-none rounded-[15px] pt-[20px] pr-[24px] p-4 pl-12 shadow-[inset_8px_8px_16px_#bec3cf,inset_-8px_-8px_16px_#ffffff] text-[#3d4468] text-sm sm:text-base md:text-lg outline-none"
                  type="email"
                  placeholder="Email Address"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              {warnings.email && (
                <p className="text-red-500 font-extralight text-xs sm:text-sm mt-1.5 pl-2">
                  {warnings.email}
                </p>
              )}
            </div>
            <div>
              <div className="relative ">
                {/* <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[#9499b7]">
                <UserIcon />
              </div> */}
                <div
                  className="
        w-full bg-[#e0e5ec]
        rounded-[15px]
        shadow-[inset_8px_8px_16px_#bec3cf,inset_-8px_-8px_16px_#ffffff]
        pl-5 pr-4 py-4 md:h-16
      ">
                  <PhoneInput
                    className="text-[#3d4468]"
                    international
                    defaultCountry="IN"
                    value={form.phoneNumber}
                    onChange={(value) => {
                      if (!value) {
                        setForm({ ...form, phoneNumber: "" });
                        return;
                      }
                      // limit to 15 digits (E.164 international standard)
                      if (value.length <= 15) {
                        setForm({
                          ...form,
                          phoneNumber: value || "",
                        });
                      }
                    }}
                    required
                    numberInputProps={{
                      maxLength: 18,
                    }}
                    countryCallingCodeEditable={false}
                  />
                </div>
              </div>
              {warnings.phoneNumber && (
                <p className="text-red-500 font-extralight text-xs sm:text-sm mt-1.5 pl-2">
                  {warnings.phoneNumber}
                </p>
              )}
            </div>
          </div>

          <div className="relative">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-sm sm:text-base md:text-lg text-[#9499b7]">
              Bio
            </div>
            <textarea
              className="w-full h-20 bg-[#e0e5ec] border-none rounded-[15px] px-[24px] py-[20px] pl-17 shadow-[inset_8px_8px_16px_#bec3cf,inset_-8px_-8px_16px_#ffffff] text-[#3d4468] text-sm sm:text-base md:text-lg outline-none placeholder:text-[#9499b7] resize-none scrollbar-hide"
              placeholder="Hey there! I'm new to Neura"
              value={form.bio}
              minLength={10}
              maxLength={140}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
            />
          </div>

          <div>
            <div className="relative">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[#9499b7]">
                <LockIcon />
              </div>
              <input
                className="w-full bg-[#e0e5ec] border-none rounded-[15px] pt-[20px] pr-[24px] pb-[20px] pl-[50px] shadow-[inset_8px_8px_16px_#bec3cf,inset_-8px_-8px_16px_#ffffff] text-[#3d4468] text-sm sm:text-base md:text-lg outline-none"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={form.password}
                minLength={10}
                maxLength={24}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />

              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 transition-all duration-300 text-[#9499b7] hover:scale-110 active:scale-95">
                <div
                  className={`transition-all duration-400 ease-in-out ${
                    showPassword
                      ? "rotate-180 opacity-100"
                      : "rotate-0 opacity-100"
                  }`}>
                  {showPassword ? <EyeOpenIcon /> : <EyeClosedIcon />}
                </div>
              </button>
            </div>
          </div>

          {/* confirm password */}
          <div>
            <div className="relative ">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[#9499b7]">
                <LockIcon />
              </div>
              <input
                className="w-full bg-[#e0e5ec] border-none rounded-[15px] pt-[20px] pr-[24px] pb-[20px] pl-[50px] shadow-[inset_8px_8px_16px_#bec3cf,inset_-8px_-8px_16px_#ffffff] text-[#3d4468] text-sm sm:text-base md:text-lg outline-none"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm Password"
                value={form.confirmPassword}
                minLength={10}
                maxLength={24}
                onChange={(e) =>
                  setForm({ ...form, confirmPassword: e.target.value })
                }
                required
              />

              <button
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 transition-all duration-300 text-[#9499b7] hover:scale-110 active:scale-95">
                <div
                  className={`transition-all duration-400 ease-in-out ${
                    showConfirmPassword
                      ? "rotate-180 opacity-100"
                      : "rotate-0 opacity-100"
                  }`}>
                  {showConfirmPassword ? <EyeOpenIcon /> : <EyeClosedIcon />}
                </div>
              </button>
            </div>
            {passwordWarning && (
              <p className="text-red-500 font-extralight text-xs sm:text-sm mt-1.5 pl-2">
                {passwordWarning}
              </p>
            )}
          </div>

          <div className="flex justify-center">
            <button
              type="submit"
              disabled={isloading}
              className="w-2/3 tracking-widest bg-[#e0e5ec] border-none rounded-[15px] p-[18px] text-[#3d4468] font-semibold shadow-[8px_8px_20px_#bec3cf,-8px_-8px_20px_#ffffff] cursor-pointer mt-4 transition-all duration-200 ease-in-out">
              {isloading ? "Authenticating..." : "Register"}
            </button>
          </div>
        </form>

        <div className="flex items-center justify-center mt-8">
          <p className="text-[#9499b7] text-sm sm:text-base md:text-lg">
            Already have an account?&nbsp;
          </p>
          <Link
            href="/login"
            className="text-[#3d4468] font-bold text-sm sm:text-base md:text-lg decoration-0 ">
            Login
          </Link>
        </div>
      </div>

      {/* Verification  Security Modal view */}
      {showModal && (
        <div className="absolute h-[130dvh] inset-0 z-50 flex justify-center items-center bg-black/10 backdrop-blur-sm transition-opacity ease-in duration-1000">
          <div className="bg-[#e0e5ec] rounded-4xl shadow-[25px_25px_75px_#a3a8b4,-25px_-25px_75px_#ffffff] max-w-md w-full p-8 mx-4 text-center">
            <h3 className="text-[#3d4468] font-extrabold text-xl sm:text-2xl md:text-3xl mb-2">
              Verify Security Code
            </h3>
            <p className="text-[#9499b7] text-sm sm:text-base md:text-lg mb-6">
              Enter the 6 digit code sent to {form?.email}
            </p>

            {message && (
              <p className="text-[#2ecc71] text-sm sm:text-base md:text-lg font-medium mb-4">
                {message}
              </p>
            )}
            {error && (
              <p className="text-[#e74c3c] text-sm sm:text-base md:text-lg font-medium mb-4">
                {error}
              </p>
            )}

            {/* Development Mock Backup Parameter Frame */}
            {devOTP && (
              <div className="mb-6 bg-[#f8f9fa] p-3 rounded-xl border border-dashed border-[#bec3cf]">
                <p className="text-sm sm:text-base md:text-lg text-[#7f8c8d] tracking-widest uppercase font-bold">
                  Dev Sandbox System Token
                </p>
                <p className="text-2xl font-mono font-black tracking-widest text-[#2c3e50] mt-1">
                  {devOTP}
                </p>
              </div>
            )}

            <form onSubmit={handleVerifyOTP} className="space-y-5">
              <div className="relative">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[#9499b7]">
                  <LockIcon />
                </div>
                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full bg-[#e0e5ec] border-none rounded-xl h-14 text-center font-extrabold text-2xl shadow-[inset_6px_6px_12px_#bec3cf,inset_-6px_-6px_12px_#ffffff] text-[#3d4468] outline-none tracking-widest"
                />
              </div>

              <button
                type="submit"
                disabled={isloading}
                className="w-full bg-[#e0e5ec] font-bold border-none rounded-[15px] p-4 text-[#3d4468] shadow-[6px_6px_15px_#bec3cf,-6px_-6px_15px_#ffffff] active:shadow-[inset_4px_4px_8px_#bec3cf,inset_-4px_-4px_8px_#ffffff] cursor-pointer transition-all duration-200 tracking-wider">
                {isloading ? "Authenticating Account..." : "Verify & Finalize"}
              </button>
            </form>

            <div className="flex flex-col items-center justify-center mt-6 space-y-2">
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={isResending}
                className="text-[#3d4468] text-sm font-semibold hover:underline">
                {isResending ? "Resending OTP..." : "Resend OTP"}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="text-[#9499b7] text-xs hover:underline">
                Cancel & edit fields
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
