import { LoginForm } from "@/components/forms/login-form";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#eef1f5] px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full items-center justify-center">
        <LoginForm />
      </div>
    </div>
  );
}
