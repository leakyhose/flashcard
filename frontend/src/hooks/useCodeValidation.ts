import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export function useCodeValidation(code: string | undefined) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!code) {
      navigate("/", { replace: true, state: { notFound: true } });
      return;
    }

    const normalizedCode = code.toUpperCase();
    const isValidFormat = /^[A-Za-z]{4}$/.test(code);

    if (!isValidFormat) {
      navigate("/", { replace: true, state: { notFound: true } });
      return;
    }

    if (code !== normalizedCode) {
      navigate(`/${normalizedCode}`, { replace: true });
      return;
    }
  }, [code, navigate]);
}
