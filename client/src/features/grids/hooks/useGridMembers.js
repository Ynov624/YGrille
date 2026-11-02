import { useState, useEffect, useCallback } from "react";
import {
  fetchGridMembers,
  addGridMember as apiAddMember,
  updateGridMemberRole as apiUpdateRole,
  removeGridMember as apiRemoveMember,
  leaveGrid as apiLeaveGrid,
} from "../../../api/grids.js";

export function useGridMembers(gridId, isOpen, onMembersUpdated) {
  const [members, setMembers] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const reset = useCallback(() => {
    setMembers(null);
    setError(null);
  }, []);

  useEffect(() => {
    if (!isOpen || !gridId) return;

    let cancelled = false;
    fetchGridMembers(gridId)
      .then((data) => {
        if (!cancelled) {
          setMembers(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError({
            message: err.message || "Erreur lors du chargement des collaborateurs.",
            details: err.details,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, gridId]);

  const addMember = useCallback(
    async (email, role) => {
      setError(null);
      setSubmitting(true);
      try {
        const updated = await apiAddMember(gridId, { email, role });
        setMembers(updated);
        onMembersUpdated?.();
        return true;
      } catch (err) {
        setError({
          message: err.message || "Erreur lors de l'ajout du collaborateur.",
          details: err.details,
        });
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [gridId, onMembersUpdated]
  );

  const changeRole = useCallback(
    async (userId, role) => {
      setError(null);
      setActionLoadingId(userId);
      try {
        const updated = await apiUpdateRole(gridId, userId, { role });
        setMembers(updated);
        onMembersUpdated?.();
      } catch (err) {
        setError({
          message: err.message || "Erreur lors de la modification du rôle.",
          details: err.details,
        });
      } finally {
        setActionLoadingId(null);
      }
    },
    [gridId, onMembersUpdated]
  );

  const removeMember = useCallback(
    async (userId) => {
      setError(null);
      setActionLoadingId(userId);
      try {
        await apiRemoveMember(gridId, userId);
        setMembers((prev) => prev?.filter((m) => m.id !== userId) ?? null);
        onMembersUpdated?.();
      } catch (err) {
        setError({
          message: err.message || "Erreur lors du retrait du collaborateur.",
          details: err.details,
        });
      } finally {
        setActionLoadingId(null);
      }
    },
    [gridId, onMembersUpdated]
  );

  const leave = useCallback(async () => {
    setError(null);
    setSubmitting(true);
    try {
      await apiLeaveGrid(gridId);
      return true;
    } catch (err) {
      setError({
        message: err.message || "Erreur lors de la sortie de la grille.",
        details: err.details,
      });
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [gridId]);

  return {
    members,
    loading: members === null,
    error,
    submitting,
    actionLoadingId,
    addMember,
    changeRole,
    removeMember,
    leave,
    reset,
  };
}
