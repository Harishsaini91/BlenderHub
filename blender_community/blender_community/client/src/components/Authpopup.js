import { useSearchParams } from "react-router-dom";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";

export default function AuthPopup() {
  const [params] = useSearchParams();
  const mode = params.get("mode");

  return (
    <div style={{ padding: 20 }}>
      {mode === "login" ? <LoginForm isPopup={true} /> : <RegisterForm isPopup={true} />}
    </div>
  );
}
