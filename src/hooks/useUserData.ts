import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGetUserById, apiUpdateUser } from '@/lib/api';
import { User } from '@/lib/types';

// Hook optimisé pour les données utilisateur
export function useUserData(userId: string | number | null) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => apiGetUserById(Number(userId)),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook pour mettre à jour l'utilisateur avec optimistic updates
export function useUpdateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: apiUpdateUser,
    onMutate: async (updatedUser: Partial<User>) => {
      // Annuler les queries en cours
      await queryClient.cancelQueries({ queryKey: ['user', updatedUser.id] });
      
      // Snapshot de la valeur précédente
      const previousUser = queryClient.getQueryData(['user', updatedUser.id]);
      
      // Optimistic update
      queryClient.setQueryData(['user', updatedUser.id], (old: User | undefined) => 
        old ? { ...old, ...updatedUser } : undefined
      );
      
      return { previousUser };
    },
    onError: (err, updatedUser, context) => {
      // Rollback en cas d'erreur
      if (context?.previousUser) {
        queryClient.setQueryData(['user', updatedUser.id], context.previousUser);
      }
    },
    onSettled: (data, error, updatedUser) => {
      // Revalider la query
      queryClient.invalidateQueries({ queryKey: ['user', updatedUser.id] });
    },
  });
}
