const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDatabase } = require('../database/init');
const { authenticateToken } = require('../middleware/auth');
const crypto = require('crypto');

const router = express.Router();
const db = getDatabase();

// Get all active elections
router.get('/elections', authenticateToken, (req, res) => {
  const currentDate = new Date().toISOString();
  
  db.all(`
    SELECT e.*, 
           COUNT(DISTINCT c.id) as candidate_count,
           CASE 
             WHEN e.start_date > ? THEN 'upcoming'
             WHEN e.end_date < ? THEN 'ended'
             ELSE 'active'
           END as current_status
    FROM elections e
    LEFT JOIN candidates c ON e.id = c.election_id
    WHERE e.status != 'cancelled'
    GROUP BY e.id
    ORDER BY e.start_date DESC
  `, [currentDate, currentDate], (err, elections) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ elections });
  });
});

// Get election details with candidates
router.get('/elections/:electionId', authenticateToken, (req, res) => {
  const { electionId } = req.params;
  const currentDate = new Date().toISOString();

  // Get election details
  db.get(`
    SELECT e.*, 
           CASE 
             WHEN e.start_date > ? THEN 'upcoming'
             WHEN e.end_date < ? THEN 'ended'
             ELSE 'active'
           END as current_status
    FROM elections e
    WHERE e.id = ? AND e.status != 'cancelled'
  `, [currentDate, currentDate, electionId], (err, election) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!election) {
      return res.status(404).json({ error: 'Election not found' });
    }

    // Get candidates for this election
    db.all(`
      SELECT id, name, party, manifesto, image_url
      FROM candidates
      WHERE election_id = ?
      ORDER BY name
    `, [electionId], (err, candidates) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      // Check if user has already voted
      db.get(`
        SELECT id FROM votes 
        WHERE election_id = ? AND voter_id = ?
      `, [electionId, req.user.userId], (err, vote) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        res.json({
          election: {
            ...election,
            candidates,
            hasVoted: !!vote
          }
        });
      });
    });
  });
});

// Cast a vote
router.post('/vote', authenticateToken, [
  body('electionId').isInt().withMessage('Valid election ID is required'),
  body('candidateId').isInt().withMessage('Valid candidate ID is required')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { electionId, candidateId } = req.body;
    const currentDate = new Date().toISOString();

    // Check if election is active
    db.get(`
      SELECT * FROM elections 
      WHERE id = ? AND status != 'cancelled' 
      AND start_date <= ? AND end_date >= ?
    `, [electionId, currentDate, currentDate], (err, election) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!election) {
        return res.status(400).json({ error: 'Election is not active' });
      }

      // Check if user has already voted
      db.get(`
        SELECT id FROM votes 
        WHERE election_id = ? AND voter_id = ?
      `, [electionId, req.user.userId], (err, existingVote) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        if (existingVote) {
          return res.status(400).json({ error: 'You have already voted in this election' });
        }

        // Verify candidate exists and belongs to this election
        db.get(`
          SELECT id FROM candidates 
          WHERE id = ? AND election_id = ?
        `, [candidateId, electionId], (err, candidate) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }

          if (!candidate) {
            return res.status(400).json({ error: 'Invalid candidate' });
          }

          // Generate unique vote hash
          const voteHash = crypto.randomBytes(32).toString('hex');

          // Record the vote
          db.run(`
            INSERT INTO votes (election_id, voter_id, candidate_id, vote_hash)
            VALUES (?, ?, ?, ?)
          `, [electionId, req.user.userId, candidateId, voteHash], function(err) {
            if (err) {
              return res.status(500).json({ error: 'Failed to record vote' });
            }

            res.json({
              message: 'Vote cast successfully',
              voteHash,
              voteId: this.lastID
            });
          });
        });
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's voting history
router.get('/history', authenticateToken, (req, res) => {
  db.all(`
    SELECT v.id, v.vote_hash, v.timestamp,
           e.title as election_title, e.start_date, e.end_date,
           c.name as candidate_name, c.party as candidate_party
    FROM votes v
    JOIN elections e ON v.election_id = e.id
    JOIN candidates c ON v.candidate_id = c.id
    WHERE v.voter_id = ?
    ORDER BY v.timestamp DESC
  `, [req.user.userId], (err, votes) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ votes });
  });
});

// Verify vote (for transparency)
router.get('/verify/:voteHash', (req, res) => {
  const { voteHash } = req.params;

  db.get(`
    SELECT v.id, v.timestamp,
           e.title as election_title,
           c.name as candidate_name, c.party as candidate_party
    FROM votes v
    JOIN elections e ON v.election_id = e.id
    JOIN candidates c ON v.candidate_id = c.id
    WHERE v.vote_hash = ?
  `, [voteHash], (err, vote) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!vote) {
      return res.status(404).json({ error: 'Vote not found' });
    }

    res.json({
      verified: true,
      vote: {
        id: vote.id,
        timestamp: vote.timestamp,
        electionTitle: vote.election_title,
        candidateName: vote.candidate_name,
        candidateParty: vote.candidate_party
      }
    });
  });
});

// Get election results (only after election ends)
router.get('/results/:electionId', (req, res) => {
  const { electionId } = req.params;
  const currentDate = new Date().toISOString();

  // Check if election has ended
  db.get(`
    SELECT * FROM elections 
    WHERE id = ? AND end_date < ?
  `, [electionId, currentDate], (err, election) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!election) {
      return res.status(400).json({ error: 'Election has not ended yet' });
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
        election: {
          id: election.id,
          title: election.title,
          description: election.description,
          startDate: election.start_date,
          endDate: election.end_date,
          totalVotes
        },
        results: resultsWithPercentage
      });
    });
  });
});

module.exports = router; 