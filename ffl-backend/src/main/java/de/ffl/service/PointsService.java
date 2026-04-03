package de.ffl.service;

import de.ffl.domain.Points;
import de.ffl.domain.Rule;
import de.ffl.repository.PointsRepository;
import de.ffl.repository.PlayerRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PointsService {

    private final PointsRepository pointsRepository;
    private final PlayerRepository playerRepository;

    public PointsService(PointsRepository pointsRepository, PlayerRepository playerRepository) {
        this.pointsRepository = pointsRepository;
        this.playerRepository = playerRepository;
    }

    public List<Points> findByPlayerId(Long playerId) {
        return pointsRepository.findByPlayerId(playerId);
    }

    public int calculateTotalPoints(Long playerId) {
        return findByPlayerId(playerId).stream()
            .mapToInt(p -> p.getRule().getPoints() * p.getNumber())
            .sum();
    }

    public Points save(Points points) {
        return pointsRepository.save(points);
    }

    public void addPoints(Long playerId, Rule rule, int count) {
        Points points = new Points();
        points.setPlayer(playerRepository.getReferenceById(playerId));
        points.setRule(rule);
        points.setNumber(count);
        save(points);
    }
}