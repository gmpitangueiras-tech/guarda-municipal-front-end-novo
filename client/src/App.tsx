import { useEffect, useState } from "react";
import FirstAccess from "./pages/FirstAccess";
import Home from "./pages/Home";
import ResetPassword from "./pages/ResetPassword";
import ResetRequest from "./pages/ResetRequest";
import { supabase } from "./lib/supabase";

type Screen = "login" | "first-access" | "reset-request" | "reset-password";

type ProfileSeed = {
  email?: string | null;
  name?: string | null;
  cpf?: string | null;
};

type Route = { screen: Screen; tokenHash: string | null };

function readRoute(): Route {
  const raw = window.location.hash.replace(/^#/, "");
  const [path, query = ""] = raw.split("?");
  const params = new URLSearchParams(query);

  if (params.has("access_token") || params.get("type") === "recovery" || params.has("token_hash")) {
    return { screen: "reset-password", tokenHash: params.get("token_hash") };
  }
  if (path.startsWith("/redefinir-senha")) return { screen: "reset-password", tokenHash: params.get("token_hash") };
  if (path.startsWith("/redefinir")) return { screen: "reset-request", tokenHash: null };
  if (path.startsWith("/primeiro-acesso")) return { screen: "first-access", tokenHash: null };
  return { screen: "login", tokenHash: null };
}

export default function App() {
  const [route, setRoute] = useState<Route>(() => readRoute());
  const [profileSeed, setProfileSeed] = useState<ProfileSeed>({});
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const onHashChange = () => setRoute(readRoute());
    window.addEventListener("hashchange", onHashChange);

    const subscription = supabase?.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setRoute({ screen: "reset-password", tokenHash: null });
    })?.data?.subscription;

    return () => {
      window.removeEventListener("hashchange", onHashChange);
      subscription?.unsubscribe();
    };
  }, []);

  function goTo(screen: Screen, hash = "") {
    if (hash) window.location.hash = hash;
    else if (window.location.hash) window.location.hash = "";
    setRoute({ screen, tokenHash: null });
  }

  if (route.screen === "reset-password") {
    return (
      <ResetPassword
        tokenHash={route.tokenHash}
        onDone={(message) => {
          setNotice(message ?? null);
          goTo("login");
        }}
      />
    );
  }

  if (route.screen === "reset-request") {
    return <ResetRequest onBack={() => goTo("login")} />;
  }

  if (route.screen === "first-access") {
    return (
      <FirstAccess
        initialEmail={profileSeed.email ?? ""}
        initialName={profileSeed.name ?? ""}
        initialCpf={profileSeed.cpf ?? ""}
        onCompleted={() => {
          setNotice("Cadastro concluído. Entre com seu CPF e sua data de nascimento.");
          goTo("login");
        }}
      />
    );
  }

  return (
    <Home
      notice={notice}
      onFirstAccess={(profile) => {
        setProfileSeed(profile);
        setNotice(null);
        goTo("first-access", "#/primeiro-acesso");
      }}
      onResetRequest={() => {
        setNotice(null);
        goTo("reset-request", "#/redefinir");
      }}
    />
  );
}
