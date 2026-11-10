import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Login - Campus Bentahan",
  description: "Login to your campus marketplace account",
};

export default function LoginPage() {
  return (
    <div className="container mx-auto flex flex-col items-center justify-center min-h-screen py-2">
      <LoginForm />
    </div>
  );
}