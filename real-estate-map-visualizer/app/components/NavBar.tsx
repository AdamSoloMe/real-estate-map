import Link from "next/link";

const Navbar = () => {
  return (
    <nav className="w-full h-16 bg-gray-900 text-white flex items-center px-6 gap-6">
      <h1 className="text-xl font-bold">Real Estate Map</h1>
      <Link href="/" className="hover:text-gray-300">
        Home
      </Link>
    </nav>
  );
};

export default Navbar;
