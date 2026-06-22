import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';
import { Public } from '../auth/public.decorator';

@Controller('search')
export class SearchController {
  constructor(private searchService: SearchService) {}

  @Public()
  @Get()
  search(@Query('q') q: string, @Query('limit') limit = '20') {
    return this.searchService.search(q ?? '', Number(limit));
  }
}