package de.ffl.service;

import java.util.ArrayList;
import java.util.List;

import de.ffl.domain.Manager;
import de.ffl.domain.Player;

public final class WinterTransferPairs {

    private WinterTransferPairs() {
    }

    public record Pair(Player oldPlayer, Player newPlayer) {
    }

    public static List<Pair> of(Manager manager) {
        List<Pair> pairs = new ArrayList<>();
        addPair(pairs, manager.getPlayerExchangedOld1(), manager.getPlayerExchangedNew1());
        addPair(pairs, manager.getPlayerExchangedOld2(), manager.getPlayerExchangedNew2());
        addPair(pairs, manager.getPlayerExchangedOld3(), manager.getPlayerExchangedNew3());
        return pairs;
    }

    public static boolean hasTransfers(Manager manager) {
        return !of(manager).isEmpty();
    }

    public static boolean isOldPlayerOfCompletePair(Manager manager, Player player) {
        if (player == null) return false;
        return of(manager).stream().anyMatch(pair -> samePlayer(pair.oldPlayer(), player));
    }

    public static List<Player> newPlayers(Manager manager) {
        return of(manager).stream().map(Pair::newPlayer).toList();
    }

    private static void addPair(List<Pair> pairs, Player oldPlayer, Player newPlayer) {
        if (oldPlayer != null && newPlayer != null) {
            pairs.add(new Pair(oldPlayer, newPlayer));
        }
    }

    private static boolean samePlayer(Player a, Player b) {
        if (a == null || b == null) return false;
        return a.getId() != null ? a.getId().equals(b.getId()) : a.equals(b);
    }
}
