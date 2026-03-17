import express from 'express'
import { anubhutiController } from '../controllers';
import { roleCheck } from '../helper';
import { ROLES } from '../common';

const router = express.Router();

router.post('/create', anubhutiController.createAnubhuti);
router.post('/update', anubhutiController.updateAnubhuti);
router.post('/delete', roleCheck([ROLES.ADMIN]), anubhutiController.deleteAnubhuti);
router.get('/get', anubhutiController.getAnubhuti);

export default router;
