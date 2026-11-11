import { useEffect, useState } from 'react';
import { Alert, Button, Snackbar } from '@mui/material';
import { applyUpdate } from '../pwa';

// Deux signaux que l'utilisateur doit voir, et qui n'existaient pas :
//  - la perte de connexion, pour qu'il sache pourquoi ses actions échouent ;
//  - la disponibilité d'une nouvelle version, qu'il choisit d'appliquer — on
//    ne recharge jamais la page sous ses doigts pendant une saisie.
export function ConnectionStatus({ updateAvailable }: { updateAvailable: boolean }) {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  return (
    <>
      <Snackbar
        open={offline}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        // `role="status"` plutôt qu'une alerte intrusive : l'information est
        // annoncée aux lecteurs d'écran sans interrompre la tâche en cours.
      >
        <Alert severity="warning" variant="filled" role="status" sx={{ width: '100%' }}>
          Vous êtes hors connexion. Vos actions ne seront pas enregistrées tant que le réseau
          n'est pas revenu.
        </Alert>
      </Snackbar>

      <Snackbar open={updateAvailable} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert
          severity="info"
          variant="filled"
          role="status"
          sx={{ width: '100%' }}
          action={
            <Button color="inherit" size="small" onClick={() => void applyUpdate()}>
              Mettre à jour
            </Button>
          }
        >
          Une nouvelle version de l'application est disponible.
        </Alert>
      </Snackbar>
    </>
  );
}
