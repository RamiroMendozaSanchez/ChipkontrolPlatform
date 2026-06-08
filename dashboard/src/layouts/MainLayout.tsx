import Navbar from "../components/Navbar";

export default function MainLayout({ children }: any) {
  return (
    <div className="container">
      <Navbar />
      <div className="main">{children}</div>
    </div>
  );
}