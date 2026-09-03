package de.ffl.repository;

import de.ffl.domain.PwaInstallClick;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface PwaInstallClickRepository extends JpaRepository<PwaInstallClick, Long> {

    @Query("SELECT YEAR(c.clickAt) as year, MONTH(c.clickAt) as month, c.user.login as login, " +
           "c.user.firstName as firstName, c.user.lastName as lastName, COUNT(c) as cnt " +
           "FROM PwaInstallClick c " +
           "WHERE c.clickAt >= :from AND c.clickAt < :to " +
           "GROUP BY YEAR(c.clickAt), MONTH(c.clickAt), c.user.login, c.user.firstName, c.user.lastName " +
           "ORDER BY YEAR(c.clickAt), MONTH(c.clickAt), c.user.login")
    List<Object[]> countClicksByUserAndMonth(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);
}
