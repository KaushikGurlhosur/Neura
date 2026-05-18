const Home = () => {
  return (
    <div className="min-h-dvh flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-xl sm:text-2xl md:text-4xl  font-extrabold">
          Welcome To <span className="text-orange-400">Neura</span>
        </h1>
        <p className="text-lg sm:text-xl md:text-2xl font-extralight opacity-50 mt-1 sm:mt-2 text-amber-300">
          A modern messaging application
        </p>
      </div>
    </div>
  );
};

export default Home;
