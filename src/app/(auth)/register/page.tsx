import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Register | Functional Analyst Portal",
};

const RegisterPage = () => <RegisterForm />;

export default RegisterPage;
