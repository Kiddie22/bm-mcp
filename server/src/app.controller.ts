import { Controller, Get, Body, Post, Put, Headers } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // Get user's own data (authenticated)
  @Get('me')
  getMyUser(@Headers('authorization') authHeader: string): any {
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return { error: 'Access token required' };
    }
    return this.appService.getMyUser(token);
  }

  // Get user's own data (authenticated)
  @Get('users')
  getAllUsers(): any {
    return this.appService.getAllUsers();
  }

  // Get FX rate
  @Get('fx')
  getFxRate() {
    return { fxRate: this.appService.getFxRate() };
  }

  // Update FX rate
  @Put('fx')
  setFxRate(@Body('rate') rate: number) {
    this.appService.setFxRate(rate);
    return { fxRate: this.appService.getFxRate() };
  }

  // Transfer funds between accounts (authenticated)
  @Post('transfer')
  transfer(
    @Headers('authorization') authHeader: string,
    @Body() body: { from: 'AUD' | 'USD'; to: 'AUD' | 'USD'; amount: number }
  ): any {
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return { success: false, message: 'Access token required' };
    }
    
    return this.appService.transferFunds(token, body.from, body.to, body.amount);
  }
}
