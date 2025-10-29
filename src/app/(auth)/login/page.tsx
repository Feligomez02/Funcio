import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in | Functional Analyst Portal",
};

const LoginPage = () => <LoginForm />;

export default LoginPage;
