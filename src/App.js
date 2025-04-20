import React, { useEffect } from "react";
import axios from "axios";

function App() {
  useEffect(() => {
    const fetchWalletTokens = async () => {
      const headers = {
        accept: "application/json",
        token: process.env.REACT_APP_SOLSCAN_API_KEY,
      };

      try {
        const res = await axios.get(
          `https://pro-api.solscan.io/v1.0/account/tokens?account=YourWalletAddressHere`,
          { headers }
        );
        console.log("Solscan data:", res.data);
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };

    fetchWalletTokens();
  }, []);

  return <h1>SolGuardian Monitor</h1>;
}

export default App;
