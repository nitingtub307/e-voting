const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDatabase } = require('../database/init');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const db = getDatabase();

// Apply admin middleware to all routes
router.use(authenticateToken, requireAdmin);

// Get system statistics
router.get('/stats', (req, res) => {
  db.get(`
    SELECT 
      (SELECT COUNT(*) FROM users WHERE role = 'voter') as total_voters,
      (SELECT COUNT(*) FROM users WHERE role = 'voter' AND is_verified = 1) as verified_voters,
      (SELECT COUNT(*) FROM elections) as total_elections,
      (SELECT COUNT(*) FROM elections WHERE status = 'active') as active_elections,
      (SELECT COUNT(*) FROM candidates) as total_candidates,
      (SELECT COUNT(*) FROM votes) as total_votes
  `, (err, stats) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ stats });
  });
});

// Get all users
router.get('/users', (req, res) => {
  db.all(`
    SELECT id, username, email, full_name, voter_id, role, is_verified, created_at
    FROM users
    ORDER BY created_at DESC
  `, (err, users) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ users });
  });
});

// Verify a voter
router.put('/users/:userId/verify', (req, res) => {
  const { userId } = req.params;

  db.run(`
    UPDATE users 
    SET is_verified = 1, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ? AND role = 'voter'
  `, [userId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'User not found or not a voter' });
    }

    res.json({ message: 'User verified successfully' });
  });
});

// Create new election
router.post('/elections', [
  body('title').notEmpty().withMessage('Election title is required'),
  body('description').notEmpty().withMessage('Election description is required'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').isISO8601().withMessage('Valid end date is required')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, startDate, endDate } = req.body;

    // Validate dates
    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }

    db.run(`
      INSERT INTO elections (title, description, start_date, end_date)
      VALUES (?, ?, ?, ?)
    `, [title, description, startDate, endDate], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create election' });
      }

      res.status(201).json({
        message: 'Election created successfully',
        electionId: this.lastID
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all elections with details
router.get('/elections', (req, res) => {
  db.all(`
    SELECT e.*, 
           COUNT(DISTINCT c.id) as candidate_count,
           COUNT(DISTINCT v.id) as vote_count
    FROM elections e
    LEFT JOIN candidates c ON e.id = c.election_id
    LEFT JOIN votes v ON e.id = v.election_id
    GROUP BY e.id
    ORDER BY e.created_at DESC
  `, (err, elections) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ elections });
  });
});

// Update election
router.put('/elections/:electionId', [
  body('title').notEmpty().withMessage('Election title is required'),
  body('description').notEmpty().withMessage('Election description is required'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').isISO8601().withMessage('Valid end date is required'),
  body('status').isIn(['upcoming', 'active', 'ended', 'cancelled']).withMessage('Valid status is required')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { electionId } = req.params;
    const { title, description, startDate, endDate, status } = req.body;

    db.run(`
      UPDATE elections 
      SET title = ?, description = ?, start_date = ?, end_date = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [title, description, startDate, endDate, status, electionId], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update election' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Election not found' });
      }

      res.json({ message: 'Election updated successfully' });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete election (only if no votes cast)
router.delete('/elections/:electionId', (req, res) => {
  const { electionId } = req.params;

  // Check if any votes have been cast
  db.get(`
    SELECT COUNT(*) as vote_count FROM votes WHERE election_id = ?
  `, [electionId], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (result.vote_count > 0) {
      return res.status(400).json({ error: 'Cannot delete election with existing votes' });
    }

    // Delete candidates first (due to foreign key constraint)
    db.run(`
      DELETE FROM candidates WHERE election_id = ?
    `, [electionId], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete candidates' });
      }

      // Delete election
      db.run(`
        DELETE FROM elections WHERE id = ?
      `, [electionId], function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to delete election' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'Election not found' });
        }

        res.json({ message: 'Election deleted successfully' });
      });
    });
  });
});

// Add candidate to election
router.post('/elections/:electionId/candidates', [
  body('name').notEmpty().withMessage('Candidate name is required'),
  body('party').notEmpty().withMessage('Party is required'),
  body('manifesto').notEmpty().withMessage('Manifesto is required')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { electionId } = req.params;
    const { name, party, manifesto, imageUrl } = req.body;

    // Check if election exists
    db.get(`
      SELECT id FROM elections WHERE id = ?
    `, [electionId], (err, election) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!election) {
        return res.status(404).json({ error: 'Election not found' });
      }

      // Add candidate
      db.run(`
        INSERT INTO candidates (election_id, name, party, manifesto, image_url)
        VALUES (?, ?, ?, ?, ?)
      `, [electionId, name, party, manifesto, imageUrl || null], function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to add candidate' });
        }

        res.status(201).json({
          message: 'Candidate added successfully',
          candidateId: this.lastID
        });
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get candidates for an election
router.get('/elections/:electionId/candidates', (req, res) => {
  const { electionId } = req.params;

  db.all(`
    SELECT c.*, COUNT(v.id) as vote_count
    FROM candidates c
    LEFT JOIN votes v ON c.id = v.candidate_id AND v.election_id = ?
    WHERE c.election_id = ?
    GROUP BY c.id
    ORDER BY c.name
  `, [electionId, electionId], (err, candidates) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ candidates });
  });
});

// Update candidate
router.put('/candidates/:candidateId', [
  body('name').notEmpty().withMessage('Candidate name is required'),
  body('party').notEmpty().withMessage('Party is required'),
  body('manifesto').notEmpty().withMessage('Manifesto is required')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { candidateId } = req.params;
    const { name, party, manifesto, imageUrl } = req.body;

    db.run(`
      UPDATE candidates 
      SET name = ?, party = ?, manifesto = ?, image_url = ?
      WHERE id = ?
    `, [name, party, manifesto, imageUrl || null, candidateId], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update candidate' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Candidate not found' });
      }

      res.json({ message: 'Candidate updated successfully' });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete candidate (only if no votes cast)
router.delete('/candidates/:candidateId', (req, res) => {
  const { candidateId } = req.params;

  // Check if any votes have been cast for this candidate
  db.get(`
    SELECT COUNT(*) as vote_count FROM votes WHERE candidate_id = ?
  `, [candidateId], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (result.vote_count > 0) {
      return res.status(400).json({ error: 'Cannot delete candidate with existing votes' });
    }

    db.run(`
      DELETE FROM candidates WHERE id = ?
    `, [candidateId], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete candidate' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Candidate not found' });
      }

      res.json({ message: 'Candidate deleted successfully' });
    });
  });
});

// Get detailed election results
router.get('/elections/:electionId/results', (req, res) => {
  const { electionId } = req.params;

  // Get election details
  db.get(`
    SELECT * FROM elections WHERE id = ?
  `, [electionId], (err, election) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!election) {
      return res.status(404).json({ error: 'Election not found' });
    }

    // Get vote counts for each candidate
    db.all(`
      SELECT c.id, c.name, c.party, c.manifesto,
             COUNT(v.id) as vote_count
      FROM candidates c
      LEFT JOIN votes v ON c.id = v.candidate_id AND v.election_id = ?
      WHERE c.election_id = ?
      GROUP BY c.id
      ORDER BY vote_count DESC
    `, [electionId, electionId], (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      // Calculate total votes
      const totalVotes = results.reduce((sum, candidate) => sum + candidate.vote_count, 0);

      // Add percentage to each candidate
      const resultsWithPercentage = results.map(candidate => ({
        ...candidate,
        percentage: totalVotes > 0 ? ((candidate.vote_count / totalVotes) * 100).toFixed(2) : 0
      }));

      res.json({
        election,
        results: resultsWithPercentage,
        totalVotes
      });
    });
  });
});

module.exports = router; 