import { useEffect, useState } from 'react';
import { networkController, NetworkState } from '@/core/networkController';

export function useNetwork() {
  const [state, setState] = useState<NetworkState>(networkController.getState());
  useEffect(() => {
    const unsub = networkController.subscribe((s) => setState(s));
    return unsub;
  }, []);
  return state;
}

export default useNetwork;
