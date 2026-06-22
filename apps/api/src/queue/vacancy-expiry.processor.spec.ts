import { VacancyExpiryProcessor } from './vacancy-expiry.processor';
import { VacanciesService } from '../vacancies/vacancies.service';
import { Job } from 'bullmq';

describe('VacancyExpiryProcessor', () => {
  const vacancies = { autoCloseExpired: jest.fn().mockResolvedValue({ count: 3 }) } as unknown as VacanciesService;
  let processor: VacancyExpiryProcessor;

  beforeEach(() => {
    jest.clearAllMocks();
    processor = new VacancyExpiryProcessor(vacancies);
  });

  it('calls autoCloseExpired when processing a job', async () => {
    await processor.process({ id: '1' } as Job);
    expect(vacancies.autoCloseExpired).toHaveBeenCalled();
  });
});
