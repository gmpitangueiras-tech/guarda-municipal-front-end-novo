import { useState } from "react";
import FirstAccess from "./pages/FirstAccess";
import Home from "./pages/Home";

type Screen = "login" | "first-access";

type ProfileSeed = {
  email?: string | null;
  name?: string | null;
};

export default function App() {
  const [screen, setScreen] = useState<Screen>("login");
  const [profileSeed, setProfileSeed] = useState<ProfileSeed>({});

  if (screen === "first-access") {
    return (
      <FirstAccess
        initialEmail={profileSeed.email ?? ""}
        initialName={profileSeed.name ?? ""}
        onCompleted={() => setScreen("login")}
      />
    );
  }

  return (
    <Home
      onFirstAccess={(profile) => {
        setProfileSeed(profile);
        setScreen("first-access");
      }}
    />
  );
}
