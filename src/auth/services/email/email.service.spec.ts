// import { Test, TestingModule } from '@nestjs/testing';
// import { EmailService } from './email.service';

// describe('EmailService', () => {
//   let service: EmailService;

//   beforeEach(async () => {
//     const module: TestingModule = await Test.createTestingModule({
//       providers: [EmailService],
//     }).compile();

//     service = module.get<EmailService>(EmailService);
//   });

//   it('should be defined', () => {
//     expect(service).toBeDefined();
//   });
// });


import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}