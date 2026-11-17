import { lazy, Suspense, useEffect, useState } from "react";
import FirstAccess from "./pages/FirstAccess";
import Home from "./pages/Home";
import ResetPassword from "./pages/ResetPassword";
import ResetRequest from "./pages/ResetRequest";
import { getAuthenticatedProfile, signOut, type PerfilFuncional } from "./lib/auth";
import { supabase } from "./lib/supabase";
import brasaoGuarda from "./assets/brasao-guarda-pitangueiras.png";

type Screen = "login" | "first-access" | "reset-request" | "reset-password" | "dashboard";

type ProfileSeed = {
  email?: string | null;
  name?: string | null;
  cpf?: string | null;
};

type Route = { screen: Screen; tokenHash: string | null };

const Dashboard = lazy(() => import("./pages/Dashboard"));

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
  if (path.startsWith("/inicio") || path.startsWith("/painel")) return { screen: "dashboard", tokenHash: null };
  return { screen: "login", tokenHash: null };
}

export default function App() {
  const [route, setRoute] = useState<Route>(() => readRoute());
  const [profileSeed, setProfileSeed] = useState<ProfileSeed>({});
  const [profile, setProfile] = useState<PerfilFuncional | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    let active = true;
    const startingScreen = readRoute().screen;
    const onHashChange = () => setRoute(readRoute());
    window.addEventListener("hashchange", onHashChange);

    const subscription = supabase?.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setRoute({ screen: "reset-password", tokenHash: null });
      }
      if (event === "SIGNED_OUT") {
        setProfile(null);
        if (readRoute().screen === "dashboard") setRoute({ screen: "login", tokenHash: null });
      }
    })?.data?.subscription;

    async function restoreSession() {
      if (supabase && (startingScreen === "login" || startingScreen === "dashboard")) {
        const { data, error } = await supabase.auth.getSession();
        if (!active) return;
        if (error) console.warn("Não foi possível recuperar a sessão Supabase.", error);

        if (data.session) {
          const restoredProfile = await getAuthenticatedProfile();
          if (!active) return;
          if (restoredProfile) {
            setProfile(restoredProfile);
            setRoute({ screen: "dashboard", tokenHash: null });
            if (startingScreen !== "dashboard") {
              window.history.replaceState(null, "", `${window.location.pathname}#/inicio`);
            }
          } else {
            await signOut();
            if (!active) return;
            setNotice("Sua sessão não está vinculada a um perfil ativo. Entre novamente.");
            setRoute({ screen: "login", tokenHash: null });
            window.history.replaceState(null, "", window.location.pathname);
          }
        } else if (startingScreen === "dashboard") {
          setRoute({ screen: "login", tokenHash: null });
          window.history.replaceState(null, "", window.location.pathname);
        }
      }
      if (active) setSessionReady(true);
    }

    void restoreSession();
    return () => {
      active = false;
      window.removeEventListener("hashchange", onHashChange);
      subscription?.unsubscribe();
    };
  }, []);

  function goTo(screen: Screen, hash = "") {
    if (hash) window.location.hash = hash;
    else if (window.location.hash) window.location.hash = "";
    setRoute({ screen, tokenHash: null });
  }

  async function handleSignOut() {
    await signOut();
    setProfile(null);
    setNotice("Você saiu do sistema com segurança.");
    goTo("login");
  }

  if (!sessionReady) {
    return (
      <main className="session-boot" role="status" aria-live="polite">
        <div className="session-boot-mark">
          <img src={brasaoGuarda} alt="Brasão da Guarda Municipal de Pitangueiras" />
          <span className="session-boot-ring" aria-hidden="true" />
        </div>
        <p className="eyebrow">Guarda Municipal · Pitangueiras</p>
        <h1>Preparando acesso seguro</h1>
        <p>Conferindo sua sessão de trabalho.</p>
      </main>
    );
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

  if (route.screen === "dashboard" && profile) {
    return (
      <Suspense fallback={<main className="session-boot" role="status" aria-live="polite"><h1>Preparando seu painel</h1><p>Carregando suas informações.</p></main>}>
        <Dashboard profile={profile} onSignOut={handleSignOut} />
      </Suspense>
    );
  }

  return (
    <Home
      notice={notice}
      onLoginSuccess={(nextProfile) => {
        setProfile(nextProfile);
        setNotice(null);
        goTo("dashboard", "#/inicio");
      }}
      onFirstAccess={(nextProfile) => {
        setProfileSeed(nextProfile);
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
